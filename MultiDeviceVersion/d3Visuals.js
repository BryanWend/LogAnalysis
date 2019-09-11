const fs = require('fs');
const path = require('path');
const d3 = require('d3');
const jsdom = require('jsdom');

const JSDOM = jsdom.JSDOM;
const outputLocation = path.join(__dirname, './UsageChart.svg')
const dom = new JSDOM("");

dom.window.d3 = d3.select(dom.window.document); //get d3 into the dom
let width = 400,
    height = 400,
    margin = 20


module.exports = {


  createText: function(array, columnNum , tWidth, tHeight){

    return new Promise((resolve, reject) => {

        let textSVG = dom.window.d3.select('div')
          .append('svg')
          .style('display','block')
          .style('float','left')
          // .style('border','1px solid black')
          // .style('background-color', '#bad5ff')
          .attr('xmlns', 'http://www.w3.org/2000/svg')
          .attr('width', tWidth)
          .attr('height', tHeight);

        let texts = textSVG.selectAll('text')
          .data(array)
          .enter().append('text')          
          // .style('border','1px solid black')
          .attr('x', function(d,i){return 120 * (i % columnNum)})
          .attr('y', function(d,i){return 30 * ( Math.floor(i/columnNum) ) })
          .attr('fill', '#000')
          .attr("transform", "translate(" + 0 + "," + 35 / 1.25 + ")")
          .text(function(d){return d});

          textSVG.append('text').text('Title here');

        resolve(fs.writeFileSync(outputLocation, dom.window.d3.select('body').html()));      
    })
  },


  createPieChart: function(data){
    
    return new Promise((resolve, reject) => {

      let radius = width / 2 - margin

      //Append the svg object to the body
      pieSVG = dom.window.d3.select('body')
        .append('div').attr('class', 'container')
        // .style('position','relative')
        .append('svg')
                  .style('display','block')
          .style('clear','both')
        .attr('xmlns', 'http://www.w3.org/2000/svg')
          .attr('width', width + 350)
          .attr('height', height + 125)
          // .style('position','absolute').style('top',0).style('left',0)
        .append('g')
          .attr('transform', 'translate(' + width / 1.125 + ',' + height / 1.5 + ')');

      //Set the color scale
      let color = d3.scaleOrdinal()
        .range(d3.schemeDark2);

      //Compute the position of each group on the pie:
      let pie = d3.pie()
        .sort(null) //Do not sort group by size
        .value(function(d) {return d.value; })
      let data_ready = pie(d3.entries(data));

      //The arc generator
      let arc = d3.arc()
        .innerRadius(radius * 0.35)   //Size of the donut hole
        .outerRadius(radius * 0.8);

      //Second arc for labels positioning
      let outerArc = d3.arc()
        .innerRadius(radius)
        .outerRadius(radius);

      //Build the pie chart: Each part of the pie is a path that we build using the arc function.
      pieSVG
        .selectAll('allSlices')
        .data(data_ready)
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('fill', function(d){ return(color(d.data.key)) })
        .attr('stroke', 'white')
        .style('stroke-width', '2px')
        .style('opacity', 0.7);

      //Add the polylines between chart and labels:
      pieSVG
        .selectAll('allPolylines')
        .data(data_ready)
        .enter()
        .append('polyline')
          .attr('stroke', 'black')
          .style('fill', 'none')
          .attr('stroke-width', 1)
          .attr('points', function(d) {
            let posA = arc.centroid(d); //line insertion in the slice
            let posB = outerArc.centroid(d); //line break: we use the other arc generator that has been built only for that
            let posC = outerArc.centroid(d); //Label position = almost the same as posB
            let midangle = d.startAngle + (d.endAngle - d.startAngle) / 2; //we need the angle to see if the X position will be at the extreme right or extreme left
            posC[0] = radius * 0.95 * (midangle < Math.PI ? 1 : -1); //multiply by 1 or -1 to put it on the right or on the left
            return [posA, posB, posC]
          });

      //Add the labels:
      pieSVG
        .selectAll('allLabels')
        .data(data_ready)
        .enter()
        .append('text')
          .text( function(d) { return d.data.key + ': ' + d.value } ) //Control label text here
          .attr('transform', function(d) {
              let pos = outerArc.centroid(d);
              let midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
              pos[0] = radius * 0.99 * (midangle < Math.PI ? 1 : -1);
              return 'translate(' + pos + ')';
          })
          .style('text-anchor', function(d) {
              let midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
              return (midangle < Math.PI ? 'start' : 'end')
          });


      resolve(fs.writeFileSync(outputLocation, dom.window.d3.select('.container').html()));

    });
  }
}