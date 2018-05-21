var svg = d3.select("svg"),
height = +svg.attr("height"),
width = +svg.attr("width");

var detailsFrame = svg.append("svg")
.attr("height", height)
.attr("width", width*3/10);

var diagramFrame = svg.append("svg")
.attr("x", width*3/10)
.attr("height", height)
.attr("width", width*7/10);

diagramFrame.append("rect")
.attr("height", height)
.attr("width", width*7/10)
.style("fill", "none")
.style("stroke-width", 2)
.style("stroke", "black");

var diagram = diagramFrame.append("svg")
.attr("height",height-4)
.attr("width",(width*7/10)-4)
.attr("x",2)
.attr("y",2)
.call(d3.zoom()
 .scaleExtent([0.5,3])
 .translateExtent([[-.5*width,-height],[1.5*width,2*height]])
 .on("zoom", function () {
  diagram.attr("transform", d3.event.transform)
 }))
 .append("g");
// background rectangle to help with pan
diagram.append("rect")
.attr("x", -1*width)
.attr("y", -1*height)
.attr("height", height*3)
.attr("width", width*3)
.style("fill","white");

d3.queue()
 .defer(d3.csv, "/data/baseNodes.csv", function(d){
   return {
     id : d.id,
     group : d.group,
     name : d.name,
     level : d.level,
     label : d.label,
     detail : d.detail
   };
 })
 .defer(d3.csv, "/data/baseLinks.csv", function(d){
   return {
     target : d.target,
     source: d.source,
     strength: d.strength
   };
 })
 .await(ready);

function ready(error, nodes, links) {
  if (error) throw error;

  var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }))
    .force("charge", d3.forceManyBody().strength(-40))
    .force("center", d3.forceCenter((width*7/10) / 2, height / 2))
    .force("collide", d3.forceCollide(15));

  var link = diagram.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(links)
    .enter().append("line")
    .attr("stroke-width", 2)
    .attr("stroke", "#A0A5AA");

  var currentClick
  var node = diagram.append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(nodes)
    .enter().append("circle")
    .attr("r", 8)
    .attr("fill", function(d){
      switch(d.level){
        case "1":
           return "#8EADCE";
           break;
        case "2":
           return "#AA5CA0";
           break;
        case "3":
           return "#D36772";
           break;
        case "4":
           return "#FFE37F";
           break;
      };})
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended)
    )
    .on("click", selectNode);

// #2264AA #8C0079 #D72638 #FED136 old brighter colors

  var text = diagram.append("g")
    .attr("class", "texts")
    .selectAll("text")
    .data(nodes, function (d) { return d.id })
    .enter().append("text")
    .text(function (d) {
      if (d.level != "4"){ return d.label }})
    .style("font-size",14)
    .on("click", selectNode);

  node.append("title")
    .text(function(d) { return d.name; });

  var detailHeading = detailsFrame
    .append("text")
    .text("Visualizing Connections in the Boston Highway Movement")
    .style("font-weight", "bold")
    .style("font-size", 22)
    .attr("x", 15)
    .attr("y", 20)
    .call(wrap, 275);

  var detail = detailsFrame
    .append("text")
    .text("This diagram shows various key organizations and players and their connections. Click on a node in the diagram to start exploring!")
    .attr("x", 15)
    .attr("y", 95)
    .call(wrap, 250);

  var detail2 = detailsFrame
    .append("text")
    .attr("x", 15)
    .attr("y", 155);

  var resetButton = detailsFrame
    .append("text")
    .attr("x", 15)
    .attr("y", 95);

  function ticked() {
    link
      .attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });
    node
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
    text
      .attr("x", function(d) { return d.x+8; })
      .attr("y", function(d) { return d.y+4; });
  }

  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.1).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  function getNeighbors(node) {
    return links.reduce(function (neighbors, link) {
      if (link.target.id === node.id) {
        neighbors.push(link.source.id)
      } else if (link.source.id == node.id) {
        neighbors.push(link.target.id)
      }
      return neighbors
    },
  [node.id])
  }

  function isNeighborLink(node, link) {
    return link.target.id == node.id || link.source.id == node.id
  }

  function selectNode(selectedNode) {
    if (currentClick == selectedNode.id) {
      currentClick = undefined;
      reset();
    } else {
      currentClick = selectedNode.id;
      neighbors = getNeighbors(selectedNode);
      node
        .attr("r",function (d) {
        if (neighbors.indexOf(d.id) > -1) {
          return 10;
        } else {
          return 8;
        }})
        .attr("fill",function (d) {
        if (neighbors.indexOf(d.id) > -1) {
          switch(d.level){
            case "1":
               return "#8EADCE";
               break;
            case "2":
               return "#AA5CA0";
               break;
            case "3":
               return "#D36772";
               break;
            case "4":
               return "#FFE37F";
               break;;
        }} else {
          return "#A0A5AA";
        }
      });
      link
        .attr("stroke", function (d) {
        if (isNeighborLink(selectedNode, d)) {
          return "#3E4042";
        } else {
          return "#A0A5AA"
        }
      });
      text
        .text(function (d) {
          if (neighbors.indexOf(d.id) > -1) {
            return d.label;
          }
        });
      translateX = width*7/20-2*selectedNode.x;
      translateY = height/2-2*selectedNode.y;
      diagram
        .transition()
        .duration(750)
        .attr("transform","translate("+translateX+","+translateY+")scale(2,2)");
      resetButton
        .text("Reset Visualization")
        .style("fill","#FED136")
        .style("text-decoration", "underline")
        .style("font-weight", "bold")
        .on("click", function(d) {reset()})
        .on("mouseover", function(d) {d3.select(this).style("cursor", "pointer")});
      detail
        .text(selectedNode.name)
        .style("font-weight", "bold")
        .style("font-size", 16)
        .attr("x", 15)
        .attr("y", 120)
        .call(wrap, 275);
      detail2
        .text(selectedNode.detail)
        .call(wrap, 275);

      }}

  function reset() {
    node
      .attr("r",8)
      .attr("fill",function (d) {
        switch(d.level){
          case "1":
             return "#8EADCE";
             break;
          case "2":
             return "#AA5CA0";
             break;
          case "3":
             return "#D36772";
             break;
          case "4":
             return "#FFE37F";
             break;;
      }});
    link
      .attr("stroke", "#A0A5AA");
    text
      .text(function (d) {
        if (d.level != "4"){ return d.label }
        });
    diagram
      .transition()
      .duration(750)
      .attr("transform","translate(0,0)scale(1,1)");
    detail
      .text("This diagram shows various key organizations and players and their connections. Click on a node in the diagram to start exploring!")
      .style("font-weight", "normal")
      .attr("x", 15)
      .attr("y", 95)
      .call(wrap, 250);
    resetButton
      .text("");
    detail2
      .text("");
  }


  simulation
    .nodes(nodes)
    .on("tick", ticked)
    .force("link")
    .links(links)
    .distance(20);

}

function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
      words = text.text().split(/\s+/).reverse(),
      word,
      line = [],
      lineNumber = 0,
      lineHeight = 1.1,
      x = text.attr("x"),
      y = text.attr("y"),
      dy = 0, //parseFloat(text.attr("dy")),
      tspan = text.text(null)
        .append("tspan")
        .attr("x",x)
        .attr("y",y)
        .attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength()>width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan")
          .attr("x", x)
          .attr("y", y)
          .attr("dy", ++lineNumber * lineHeight + dy + "em")
          .text(word);
      }
    }
  })
}
