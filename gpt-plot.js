// set the dimensions and margins of the graph
const margin = {top: 10, right: 20, bottom: 20, left: 80}, // left was formerly 60
        width = 1000 - margin.left - margin.right,
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

let dots, labels, data, x, y, xAxis, yAxis, ydomain, scatter;
const d2labelY = x => x.System==='BaGuaLu' ? x.logY+0.1 : x.logY;
const compactFormatter = new Intl.NumberFormat("en", {notation: "compact"}).format;
function dollarFormatter(x) { 
    if (x==-1)
        return '10¢';
    else if (x==-2)
        return '1¢';
    else if (x<-2)
        return `10^${x-2}¢`;
    else
        return '$'+compactFormatter(Math.pow(10,x));
}
function oomFormatter(x) {
    return `10^${x}`;
}

Promise.all([
    d3.csv("https://docs.google.com/spreadsheets/d/1AAIebjNsnJj_uKALHbXNfn3_YsT6sHXtCU0q7OIPuc4/export?format=csv#gid=0"),
    d3.csv("https://docs.google.com/spreadsheets/d/106Bw4SgH7SbJPGfyV6LnlsB81-JHueoennE52sENrgo/export?format=csv#gid=0")
]).then(function(files) {

    data = files[0];
    benchmarks = files[1];

    delete benchmarks.columns

    benchmarks.forEach(x => {
        x.value = parseFloat(x['2022 USD']);
        x.name = x.Benchmark;
    });
    console.table(benchmarks);

    const y_quantity = 'Training compute (FLOPs)'
    //const y_quantity = 'Parameters'

    // remove models which don't have parameter counts
    data = data.filter(x => x[y_quantity] != '');

    data.forEach(x => {
        x[y_quantity] = parseFloat(x[y_quantity]);
        x.Year = parseInt(x.Year);
        x.logY = Math.log10(x[y_quantity] * 1131415.12 / 3.14e23);
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
    ydomain = [minY-yMargin, maxY+yMargin]
    y = d3.scaleLinear()
        .domain([minY-yMargin, maxY+yMargin])
        .range([ height, 0]);
    yAxis = svg.append("g")
        //.call(d3.axisLeft(y));
        //.call(d3.axisLeft(y).tickFormat(dollarFormatter))
        .call(d3.axisLeft(y).tickFormat(oomFormatter))

	// Add a clipPath: everything out of this area won't be drawn.
	let clip = svg.append("defs").append("SVG:clipPath")
		.attr("id", "clip")
		.append("SVG:rect")
		.attr("width", width )
		.attr("height", height )
		.attr("x", 0)
		.attr("y", 0);

	scatter = svg.append('g')
		.attr("clip-path", "url(#clip)")


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
	  //.text(`log₁₀( ${y_quantity} )`)
	  .text('Training compute (FLOPs)')
	  //.text('present cost of training (2022 USD)')

	// Add dots
	dots = scatter.append('g')
		.selectAll("dot")
		.data(data)
		.join("circle")
			.attr("cx", d => x(d.Year) )
			.attr("cy", d => y(d.logY) )
			.attr("r", 0)
			.style("fill", "#69b3a2")

    // Add labels

	labels = scatter.append("g")
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

    addSlider(benchmarks);

    next()

}).catch(function(err) {
    console.log(err)
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

    const path = scatter.append("path")
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

let moorePoints, mooreLine;
function addMooreLine(from, to) {

    const anchor = data.filter(x => x.System === 'GPT-3 175B (davinci)')[0];

    const x0 = anchor.Year
    const y0 = anchor.logY

    const x2y = x => Math.log10(2**((x-x0)/2.5)*10**y0)

	moorePoints = [
		{
			Year: from,
			logY: x2y(from),
		},
		{
			Year: to,
			logY: x2y(to),
		},
	]

    mooreLine = scatter.append("path")
        .datum(moorePoints)
        .attr("fill", "none")
        .attr("stroke", "rgba(255,0,0,0.5)")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(d => x(d.Year))
            .y(d => y(d.logY))
        )
        .style("stroke-dasharray", ("3, 3"))
}

function extendAxis(toYear) {

	// Get the value of the button
	xlim = this.value

	// Update X axis
	x.domain([1950,2100])
	x.domain([2012,2040])
	xAxis.transition().duration(1000)
        .call(d3.axisBottom(x).tickFormat(d3.format('d')));

	// Update Y axis
	y.domain([ydomain[1]*0.5+ydomain[0]*0.5, ydomain[1]*1.5])
	yAxis.transition().duration(1000)
        .call(d3.axisLeft(y).tickFormat(compactFormatter))

	// Update lines
	mooreLine
        .datum(moorePoints)
		.transition()
		.duration(1000)
        .attr("d", d3.line()
            .x(d => x(d.Year))
            .y(d => y(d.logY))
        )
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

	// Update dots
	svg.selectAll("circle")
		.data(data)
		.transition()
		.duration(1000)
		.attr("cx", d => x(d.Year) )
		.attr("cy", d => y(d.logY) )

	// Update labels
    labels
		.transition()
		.duration(1000)
        .attr("x", d => x(d.Year) )
        .attr("y", d => y(d2labelY(d)) )
}

function addSlider(data) {

    // set the dimensions and margins of the graph
    let margin = {top: 15, right: 5, bottom: 15, left: 5},
        width = 400,
        height = 400,
        buttonX = 5,
        textX = 20;

    // create a svg element in the body of the page
    let svg = d3.select("#slider")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");

    // get the min and max values from the data
    let minValue = d3.min(data, function(d) { return +d.value; });
    let maxValue = d3.max(data, function(d) { return +d.value; });

    // create a linear scale for the slider
    let y = d3.scaleLinear()
        .domain([minValue, maxValue])
        .range([height, 0])
        .clamp(true);

    // create the slider
    let slider = svg.append("g")
        .attr("class", "slider")
        //.attr("transform", "translate(" + width / 2 + ",0)");

    // create the track
    slider.append("line")
        .attr("class", "track")
        .attr("y1", y.range()[1])
        .attr("y2", y.range()[0])
        .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .attr("class", "track-inset")
        .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .attr("class", "track-overlay")
        .call(d3.drag()
            .on("start.interrupt", function() { slider.interrupt(); })
            .on("start drag", function() { hue(y.invert(d3.event.y)); }));

    // create the markers
    let markers = slider.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("r", 3)
        .attr("cy", function(d) { return y(d.value); })
        .attr("cx", buttonX)
        .attr("class", "marker")
        .attr("id", function(d) { return d.name; })

    // add labels to the markers
    slider.selectAll("text")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "marker-label")
        .attr("x", textX)
        .attr("y", function(d) { return y(d.value) + 5; })
        .text(function(d) { return d.name; });

    // function to update the color of the markers
    function hue(h) {
        markers
            .attr("cy", function(d) { return y(d.value); })
            .sort(function(a, b) { return d3.ascending(a.value, b.value); });
    }

    const knobRadius = 10; // radius of the knob circle
    const defaultValue = 1e10;

    // create knob element
    const knob = slider.append("circle")
        .attr("class", "knob")
        .attr("r", knobRadius)
        .attr("cx", buttonX) // position the knob in the middle of the slider
        .attr("cy", y(defaultValue))
        .style("fill", "grey")
        .call(d3.drag()
            .on("drag", dragMove)
            .on("end", dragEnd));

        function dragMove(event) {
            let newY = Math.max(0, Math.min(height, event.y - margin.top));
            knob.attr("cy", newY);
        }

        function dragEnd(event) {
            let value = y.invert(knob.attr("cy"));
            console.log("Selected value: " + value.toFixed(2));
        }

    // function to update the position of the knob based on the slider value
    function updateKnobPosition(value) {
        knob.attr("cy", y(value));
    }

    // call the updateKnobPosition function with the default value to position the knob on initialization
    updateKnobPosition(defaultValue);

}


let slideN = 0;
function next() {
	slideN++;
    if (slideN===1) {
        showDots();
    } else if (slideN===2) {
        addMooreLine(2010, 2040);
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
    } else if (slideN===7) {
        d3.select('#info')
            .html('we estimated how much it would cost to train these models today, based on GPT-3s training cost')
    }
}

