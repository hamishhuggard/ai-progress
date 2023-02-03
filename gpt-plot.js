// set the dimensions and margins of the graph
const margin = {top: 10, right: 150, bottom: 50, left: 60},
        width = 560 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

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

    console.log(r2);
    return [model, inverseModel, slope, intercept];
}

//Read the data
d3.csv("https://docs.google.com/spreadsheets/d/1AAIebjNsnJj_uKALHbXNfn3_YsT6sHXtCU0q7OIPuc4/export?format=csv#gid=0").then( function(data) {

    console.table(data);

    const y_quantity = 'Training compute (FLOPs)'
    //y_axis = 'Parameters'

    // remove models which don't have parameter counts
    data = data.filter(x => x[y_quantity] != '');

    data.forEach(x => {
        x[y_quantity] = parseFloat(x[y_quantity]);
        x.Year = parseInt(x.Year);
        x.logY = Math.log10(x[y_quantity]);
    });

    data = data.sort((a,b) => b[y_quantity] - a[y_quantity]);
    data = data.sort((a,b) => a.Year - b.Year);

    data = data.filter(x => !Number.isNaN(x.logY));

    // only use GPTs
    GPTs = [
        'InstructGPT', // no parameter count
        'GPT-3 175B (davinci)',
        'GPT-2',
        'GPT',
    ]
    data = data.filter(x => GPTs.indexOf(x.System) > -1)

    let X = data.map(x => x.Year);
    let Y = data.map(x => x.logY);

    const [params2year, year2regressionY] = linearRegression(X, Y);

    // Add point for synapses in the human brain
    [
        //{
        //    Parameters: 1.5e14, 
        //    System: 'Synapses in human brain',
        //},
        //{
        //    Parameters: 8.6e10, 
        //    System: 'Neurons in human brain',
        //},
        //{
        //    Parameters: 1.5e14*8e9,
        //    System: 'Synapses in all human brains',
        //}
    ].forEach(benchmark => {
        const {Parameters} = benchmark;
        benchmark.logY = Math.log10(Parameters);
        benchmark.Year = params2year(benchmark.logY);
        data.push(benchmark);
    })

    console.table(data);

    Y = data.map(x => x.logY);
    X = data.map(x => x.Year);

    const maxY = Math.max(...Y);
    const minY = Math.min(...Y);
    const maxX = Math.max(...X);
    const minX = Math.min(...X);
	const xMargin = (maxX-minX)*0.05;
	const yMargin = (maxY-minY)*0.05;

    // Add X axis
    const x = d3.scaleLinear()
        .domain([minX-xMargin, maxX+xMargin])
        .range([ 0, width ]);
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('d')));

    // Add Y axis
    const y = d3.scaleLinear()
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

    // Add linear regression line
    svg.append("path")
        .datum([
            {
                Year: 2012,
                logY: year2regressionY(2012),
            },
            {
                Year: 2024,
                logY: year2regressionY(2024),
            },
        ])
        .attr("fill", "none")
        .attr("stroke", "rgba(255,0,0,0.5)")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(d => x(d.Year))
            .y(d => y(d.logY))
        )
        .style("stroke-dasharray", ("3, 3"))

    /*
    // add brain synapse line
    const logSynapses = Math.log10(1.5e14);
    svg.append("path")
        .datum([
            {
                Year: 2012,
                logY: logSynapses,
            },
            {
                Year: 2024,
                logY: logSynapses,
            },
        ])
        .attr("fill", "none")
        .attr("stroke", "rgba(255,0,0,0.5)")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(d => x(d.Year))
            .y(d => y(d.logY))
        )
        .style("stroke-dasharray", ("3, 3"))
    */

	// Add dots
	svg.append('g')
		.selectAll("dot")
		.data(data)
		.join("circle")
			.attr("cx", d => x(d.Year) )
			.attr("cy", d => y(d.logY) )
			.attr("r", 2)
			.style("fill", "#69b3a2")

    // Add labels
    const d2labelY = x => x.System==='BaGuaLu' ? x.logY+0.1 : x.logY;

	svg.append("g")
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
			.text(d => d.System)
			.call(text => text.clone(true))
			.attr("fill", "none")
			//.attr("stroke", halo)
			//.attr("stroke-width", haloWidth);

})
