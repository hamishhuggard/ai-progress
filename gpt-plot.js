// set the dimensions and margins of the graph
const margin = {top: 10, right: 150, bottom: 50, left: 60},
        width = 1200 - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom;

// append the svg object to the body of the page
const svg = d3.select("#gpt-viz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);
    


function linearRegression(y,x){
    // https://stackoverflow.com/a/31566791
    let lr = {};
    let n = y.length;
    let sum_x = 0, sum_y = 0, sum_xy = 0, sum_xx = 0, sum_yy = 0;

    for (let i = 0; i < y.length; i++) {
        sum_x += x[i];
        sum_y += y[i];
        sum_xy += (x[i]*y[i]);
        sum_xx += (x[i]*x[i]);
        sum_yy += (y[i]*y[i]);
    } 

    const slope = (n * sum_xy - sum_x * sum_y) / (n*sum_xx - sum_x * sum_x);
    const intercept = (sum_y - slope * sum_x)/n;
    const r2 = Math.pow((n*sum_xy - sum_x*sum_y)/Math.sqrt((n*sum_xx-sum_x*sum_x)*(n*sum_yy-sum_y*sum_y)),2);
    const model = (x) => intercept + slope*x; 
    const inverseModel = (x) => (x-intercept)/slope;

    const xMin = Math.min(...y)
    const xMax = Math.max(...y)
    const lineMargin = 0;//Math.max(1, (xMax-xMin))
    const lineStart = xMin - lineMargin;
    const lineEnd = xMax + lineMargin;


    return [
        model, 
        inverseModel,
        lineStart,
        lineEnd,
        slope,
        intercept
    ];
}

let dots, labels, data, x, y, xAxis;

//Read the data
d3.csv("https://docs.google.com/spreadsheets/d/1AAIebjNsnJj_uKALHbXNfn3_YsT6sHXtCU0q7OIPuc4/export?format=csv#gid=0").then( function(dataArg) {

    console.table(data);

    const y_quantity = 'Training compute (FLOPs)'
    //const y_quantity = 'Parameters'

    // remove models which don't have parameter counts
    data = dataArg.filter(x => x[y_quantity] != '');

    data.forEach(x => {
        x[y_quantity] = parseFloat(x[y_quantity]);
        x.Year = parseInt(x.Year);
        x.logY = Math.log10(x[y_quantity]);
    });

    data = data.sort((a,b) => b[y_quantity] - a[y_quantity]);
    data = data.sort((a,b) => a.Year - b.Year);

    data = data.filter(x => !Number.isNaN(x.logY));

    console.table(data);

    let X = data.map(x => x.Year);
    let Y = data.map(x => x.logY);

    Y = data.map(x => x.logY);
    X = data.map(x => x.Year);

    const maxY = Math.max(...Y);
    const minY = Math.min(...Y);
    const maxX = Math.max(...X);
    const minX = Math.min(...X);
	const xMargin = (maxX-minX)*0.05;
	const yMargin = (maxY-minY)*0.05;

    // Add X axis
    x = d3.scaleLinear()
        .domain([minX-xMargin, maxX+xMargin])
        .range([ 0, width ]);
    xAxis = svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('d')));

    // Add Y axis
    y = d3.scaleLinear()
        .domain([minY-yMargin, maxY+yMargin])
        .range([ height, 0]);
    svg.append("g")
        .call(d3.axisLeft(y));


	// Add X axis label:
	svg.append("text")
	  .attr("text-anchor", "end")
	  .attr("x", width/2 + margin.left - 20)
	  .attr("y", height + margin.top + 30)
	  .text("Year");

	// Y axis label:
	svg.append("text")
	  .attr("text-anchor", "end")
	  .attr("transform", "rotate(-90)")
	  .attr("y", -margin.left + 20)
	  .attr("x", -margin.top - height/2 + 80)
	  .text(`log₁₀( ${y_quantity} )`)

	// Add dots
	dots = svg.append('g')
		.selectAll("dot")
		.data(data)
		.join("circle")
			.attr("cx", d => x(d.Year) )
			.attr("cy", d => y(d.logY) )
			.attr("r", 0)
			.style("fill", "#69b3a2")

    // Add labels
    const d2labelY = x => x.System==='BaGuaLu' ? x.logY+0.1 : x.logY;

	labels = svg.append("g")
		.attr("font-family", "sans-serif")
		.attr("font-size", 10)
		.attr("stroke-linejoin", "round")
		.attr("stroke-linecap", "round")
		.selectAll("text")
		.data(data)
		.join("text")
			.attr("dx", 7)
			.attr("dy", "0.35em")
            .attr("x", d => x(d.Year) )
            .attr("y", d => y(d2labelY(d)) )
            .attr("id", d => d.System.split(' ')[0])
			.text(d => `${d.System} (${d.Task})`)
            .style('visibility', 'hidden')

    // not sure what this code is
    //labels
    //    .call(text => text.clone(true))
    //    .attr("fill", "none")
    //    .attr("stroke", halo)
    //    .attr("stroke-width", haloWidth);

    next()

})

function showDots() {
    dots
		.transition()
		//.delay(function(d,i){return(1000+i*20)})
		.delay(function(d,i){return(500+(d.Year-1950)*20)})
		.duration(500)
		.attr("r", 5)
		.transition()
		.duration(500)
		.attr("r", 2)

}

function selectFromFilter(filter) {
    const antifilter = x => !filter(x)
    console.log('selection function')
    console.log(labels)
    console.log(labels.filter(filter))
    console.log(labels.filter(antifilter))
    dots
        .filter(filter)
        .style('visibility', 'visible')
        .transition()
        .duration(1000)
        .attr("r", 10)
    dots
        .filter(antifilter)
        .style('visibility', 'visible')
        .transition()
        .duration(1000)
        .attr("r", 2)

    labels
        .style('visibility', 'visible')

    labels
        .filter(filter)
        .style('visibility', 'visible')

    labels
        .filter(antifilter)
        .style('visibility', 'hidden')
}

function selectGPTs() {
    const GPTs = [
        'GPT-3 175B (davinci)',
        'GPT-2',
        'GPT',
    ]
    selectFromFilter(x => GPTs.indexOf(x.System) > -1)
}

function selectGANs() {
    const tasks = [
        'Image generation',
        'Text-to-image',
        'Video generation',
    ]
    selectFromFilter(x => tasks.indexOf(x.Task) > -1)
}

function selectNone() {
    selectFromFilter(x => false)
}

let preAlexLine, postAlexLine;
let preAlexPoints, postAlexPoints;

function preAlexnetRegression() {
    [preAlexLine, preAlexPoints] = regressionBetween(1900, 2012);
}

function postAlexnetRegression() {
    [postAlexLine, postAlexPoints] = regressionBetween(2012, 2100);
}

function regressionBetween(fromYear, toYear) {

    const subdata = data.filter(x => fromYear <= x.Year && x.Year < toYear);

    let X = subdata.map(x => x.Year);
    let Y = subdata.map(x => x.logY);

    const [
        params2year, 
        year2regressionY, 
        lineStart, 
        lineEnd
    ] = linearRegression(X, Y);

    console.log({params2year, year2regressionY, lineStart, lineEnd})

    // 50, 500 -> 850, 170
    console.log({startX: x(lineStart), endX: x(lineEnd)})

	points = [
		{
			Year: lineStart,
			logY: year2regressionY(lineStart),
		},
		{
			Year: lineEnd,
			logY: year2regressionY(lineEnd),
		},
	]

    const path = svg.append("path")
        .datum(points)
        .attr("fill", "none")
        .attr("stroke", "rgba(255,0,0,0.5)")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(d => x(d.Year))
            .y(d => y(d.logY))
        )
        .style("stroke-dasharray", ("3, 3"))
	return [path, points]
}

function extendAxis(toYear) {

	// Get the value of the button
	xlim = this.value

	// Update X axis
	x.domain([1950,2100])
	xAxis.transition().duration(1000).call(d3.axisBottom(x))

	// Update regression lines
	preAlexLine
        .datum(preAlexPoints)
		.transition()
		.duration(1000)
        .attr("d", d3.line()
            .x(d => x(d.Year))
            .y(d => y(d.logY))
        )
	postAlexLine
        .datum(postAlexPoints)
		.transition()
		.duration(1000)
        .attr("d", d3.line()
            .x(d => x(d.Year))
            .y(d => y(d.logY))
        )

	// Update chart
	svg.selectAll("circle")
		.data(data)
		.transition()
		.duration(1000)
		.attr("cx", d => x(d.Year) )
}

let slideN = 0;
function next() {
	slideN++;
    if (slideN===1) {
        showDots();
    } else if (slideN===2) {
        selectGPTs();
    } else if (slideN===3) {
        selectGANs();
    } else if (slideN===4) {
        selectNone();
        preAlexnetRegression();
    } else if (slideN===5) {
        postAlexnetRegression();
    } else if (slideN===6) {
        extendAxis(2100);
    }
}

