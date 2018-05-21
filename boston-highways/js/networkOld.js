var svg = d3.select("svg"),
height = +svg.attr("height"),
width = +svg.attr("width");

var detailsFrame = svg.append("svg")
.attr("height", height)
.attr("width", width*3/10)
.attr("border",1);

detailsFrame.append("rect")
.attr("height", height)
.attr("width", width*3/10)
.style("fill", "none")
.style("stroke-width", 1)
.style("stroke", "black");

var diagramFrame = svg.append("svg")
.attr("x", width*3/10)
.attr("height", height)
.attr("width", width*7/10)
.attr("border",1);

diagramFrame.append("rect")
.attr("height", height)
.attr("width", width*7/10)
.style("fill", "none")
.style("stroke-width", 1)
.style("stroke", "black");

var diagram = diagramFrame.append("svg")
.attr("height",height-1)
.attr("width",width*7/10-1)
.attr("x",.5)
.attr("y",.5)
.call(d3.zoom()
 .scaleExtent([0.5,3])
 .translateExtent([[-.5*width,-height],[1.5*width,2*height]])
 .on("zoom", function () {
  diagram.attr("transform", d3.event.transform)
 }))
.append("g");

d3.queue()
 .defer(d3.csv, "/data/baseNodes.csv")
 .defer(d3.csv, "/data/baseLinks.csv")
 .await(ready);

function ready(error, baseNodes, baseLinks) {
 if (error) throw error;

var nodes = [...baseNodes]
var links = [...baseLinks]
function getNeighbors(node) {
 return baseLinks.reduce(function (neighbors, link) {
     if (link.target.id === node.id) {
       neighbors.push(link.source.id)
     } else if (link.source.id === node.id) {
       neighbors.push(link.target.id)
     }
     return neighbors
   },
   [node.id]
 )
}
function isNeighborLink(node, link) {
 return link.target.id === node.id || link.source.id === node.id
}
function getNodeColor(node, neighbors) {
 if (Array.isArray(neighbors) && neighbors.indexOf(node.id) > -1) {
   switch(node.level){
     case 1:
        return "#2264AA";
        break;
     case 2:
        return "#8C0079";
        break;
     case 3:
        return "#D72638";
        break;
     case 4:
        return "FED136";
        break;
   }
 }
 else{ return '#000000';}

 /*} else if (node.level == 1) {
   return "#2264AA";
 } else if (node.level == 2) {
   return '#8C0079';
 } else if (node.level == 3) {
   return '#D72638';
 } else {
   return '#FED136';
 }*/
}
function getLinkColor(node, link) {
 return isNeighborLink(node, link) ? '#000000' : '#E5E5E5'
}
function getTextColor(node, neighbors) {
 return Array.isArray(neighbors) && neighbors.indexOf(node.id) > -1 ? '#000000' : '#4C4E51'
}


var linkElements,
 nodeElements,
 textElements
// we use svg groups to logically group the elements together
diagram.append("rect")
 .attr("x", -1*width*2).attr("y",-1*height*2)
 .attr("height",height*4).attr("width",width*4).attr("fill","white")
var linkGroup = diagram.append('g').attr('class', 'links')
var nodeGroup = diagram.append('g').attr('class', 'nodes')
var textGroup = diagram.append('g').attr('class', 'texts')
// we use this reference to select/deselect
// after clicking the same element twice
var selectedId
// simulation setup with all forces
var linkForce = d3
 .forceLink()
 .id(function (link) { return link.id })
 .strength(function (link) { return link.strength })
var simulation = d3
 .forceSimulation()
 .force('link', linkForce)
 .force('charge', d3.forceManyBody().strength(-120))
 .force('center', d3.forceCenter(width / 4, height / 2))
 .stop();
// var dragDrop = d3.drag().on('start', function (node) {
//   node.fx = node.x
//   node.fy = node.y
// }).on('drag', function (node) {
//   simulation.alphaTarget(0.7).restart()
//   node.fx = d3.event.x
//   node.fy = d3.event.y
// })
// .on('end', function (node) {
//   if (!d3.event.active) {
//     simulation.alphaTarget(0)
//   }
//   // node.fx = null
//   // node.fy = null
// })
// select node is called on every click
// we either update the data according to the selection
// or reset the data if the same node is clicked twice
function selectNode(selectedNode) {
 if (selectedId === selectedNode.id) {
   selectedId = undefined
   resetData()
   updateSimulation()
 } else {
   selectedId = selectedNode.id
   updateData(selectedNode)
   updateSimulation()
 }
 var neighbors = getNeighbors(selectedNode)
 // we modify the styles to highlight selected nodes
 nodeElements.attr('fill', function (node) { return getNodeColor(node, neighbors) })
 textElements.attr('fill', function (node) { return getTextColor(node, neighbors) })
 linkElements.attr('stroke', function (link) { return getLinkColor(selectedNode, link) })
}
// this helper simple adds all nodes and links
// that are missing, to recreate the initial state
function resetData() {
 var nodeIds = nodes.map(function (node) { return node.id })
 baseNodes.forEach(function (node) {
   if (nodeIds.indexOf(node.id) === -1) {
     nodes.push(node)
   }
 })
 links = baseLinks
}
// diffing and mutating the data
function updateData(selectedNode) {
 var neighbors = getNeighbors(selectedNode)
 var newNodes = baseNodes.filter(function (node) {
   return neighbors.indexOf(node.id) > -1 || node.level === 1
 })
 var diff = {
   removed: nodes.filter(function (node) { return newNodes.indexOf(node) === -1 }),
   added: newNodes.filter(function (node) { return nodes.indexOf(node) === -1 })
 }
 diff.removed.forEach(function (node) { nodes.splice(nodes.indexOf(node), 1) })
 diff.added.forEach(function (node) { nodes.push(node) })
 links = baseLinks.filter(function (link) {
   return link.target.id === selectedNode.id || link.source.id === selectedNode.id
 })
}
function updateGraph() {
 // links
 linkElements = linkGroup.selectAll('line')
   .data(links, function (link) {
     return link.target.id + link.source.id
   })
 linkElements.exit().remove()
 var linkEnter = linkElements
   .enter().append('line')
   .attr('stroke-width', 1)
   .attr('stroke', 'rgba(50, 50, 50, 0.2)')
 linkElements = linkEnter.merge(linkElements)

 // nodes
 nodeElements = nodeGroup.selectAll('circle')
   .data(nodes, function (node) { return node.id })
 nodeElements.exit().remove()
 var nodeEnter = nodeElements
   .enter()
   .append('circle')
   .attr('r', 10)
   .attr('fill', function (node) {
     if (node.level == 1) {
       return "#2264AA";
     } else if (node.level == 2) {
       return '#8C0079';
     } else if (node.level == 3) {
       return '#D72638';
     } else {
       return '#FED136';
     };})
   // .call(dragDrop)
   // we link the selectNode method here
   // to update the graph on every click
   .on('click', selectNode)
 nodeElements = nodeEnter.merge(nodeElements)
 // texts
 textElements = textGroup.selectAll('text')
   .data(nodes, function (node) { return node.id })
 textElements.exit().remove()
 var textEnter = textElements
   .enter()
   .append('text')
   .text(function (node) { return node.label })
   .attr('font-size', 15)
   .attr('dx', 15)
   .attr('dy', 4)
 textElements = textEnter.merge(textElements)
}
function updateSimulation() {
 updateGraph()
 simulation.nodes(nodes).on('tick', () => {
   nodeElements
     .attr('cx', function (node) { return node.x })
     .attr('cy', function (node) { return node.y })
   textElements
     .attr('x', function (node) { return node.x })
     .attr('y', function (node) { return node.y })
   linkElements
     .attr('x1', function (link) { return link.source.x })
     .attr('y1', function (link) { return link.source.y })
     .attr('x2', function (link) { return link.target.x })
     .attr('y2', function (link) { return link.target.y })
 })
 simulation.force('link').links(links)
 simulation.alphaTarget(0.7).restart()
}
// last but not least, we call updateSimulation
// to trigger the initial render
updateSimulation()

}
