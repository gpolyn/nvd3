//TODO: consider deprecating by adding necessary features to multiBar model
nv.models.discreteBar = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 0, right: 0, bottom: 0, left: 0}
        , width = 960
        , height = 500
        , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
        , x = d3.scale.ordinal()
        , y = d3.scale.linear()
        , getX = function(d) { return d.x }
        , getY = function(d) { return d.y }
        , obtainMinimaeAndMaximae = function(data) {
            
            var lastMin, lastMax;
            var minimae = {}, maximae = {};
            var previous, current;

            if ( data.length > 0){ // ensure first max is captured
              lastMax = {value: data[0], index: 0};
              lastMin = {value: data[0], index: 0};
            }

            for (var i = 1; i < data.length; i++) {

              previous = data[i-1]
              current = data[i]

              if (current > previous){
                lastMax = {value: current, index: i}
              } else if (lastMax != undefined){
                maximae[lastMax["index"]] = lastMax["value"]; // save
                lastMax = undefined; // reset
              }

              if (current < previous){
                lastMin = {value: current, index: i}
              } else if (lastMin != undefined){
                minimae[lastMin["index"]] = lastMin["value"]; // save
                lastMin = undefined; // reset
              }
            }

            if (lastMin != undefined){
                minimae[lastMin["index"]] = lastMin["value"]; // save
            }

            if (lastMax != undefined){
                maximae[lastMax["index"]] = lastMax["value"]; // save
            }

            var whichToShow = data.map(function(val, i){
              if (maximae.hasOwnProperty(i) || minimae.hasOwnProperty(i)) {
                return true;
              } else {
                return false; 
              }
            })

            var minimaeForSorting = [];
            var maximaeForSorting = [];

            for (var ele in minimae ){
              minimaeForSorting.push([ele, minimae[ele]]);
            }

            for (var ele in maximae ){
              maximaeForSorting.push([ele, maximae[ele]]);
            }

            minimaeForSorting = minimaeForSorting.sort(function(a,b){
              return a[1] - b[1]; 
            });

            maximaeForSorting = maximaeForSorting.sort(function(a,b){
              return b[1] - a[1]; 
            });

            console.log("maximaeForSorting",maximaeForSorting)
            var dontRemoveTheseMinima = minimaeForSorting.slice(0,3);
            var dontRemoveTheseMaxima = maximaeForSorting.slice(0,3);

            dontRemoveTheseMinima = dontRemoveTheseMinima.map(function(i){
              return parseInt(i[0])
            });
            dontRemoveTheseMaxima = dontRemoveTheseMaxima.map(function(i){
              return parseInt(i[0])
            });

            console.log("dontRemoveTheseMaxima", dontRemoveTheseMaxima)
            console.log("dontRemoveTheseMinima", dontRemoveTheseMinima)
            console.log("dontRemoveTheseMinima", dontRemoveTheseMinima)

            var removeValue;

            whichToShow = Array.apply(null, new Array(data.length)).map(function(){return false})
            console.log("whichToShow", whichToShow)
            for (var i = 0; i < whichToShow.length; i++) {
              console.log(i)
              // if (dontRemoveTheseMinima.hasOwnProperty(i) || dontRemoveTheseMaxima.hasOwnProperty(i)){
              if (dontRemoveTheseMinima.indexOf(i) >= 0 ){
                // console.log(i)
                whichToShow[i] = true;
              }
              if (dontRemoveTheseMaxima.indexOf(i) >= 0){
                // console.log(i)
                whichToShow[i] = true;
              }

            }

            var interimArray = whichToShow.map(function(bool, i){
              return bool ? data[i] : -i;
            });

            console.log("interimArray", interimArray)

						var seen = {};
						interimArray = interimArray.map(function(item) {

							if (seen.hasOwnProperty(item)){
								return -1;								
							} else {
								seen[item] = true;	
								return item;								
							}
	
						});

						interimArray.forEach(function(ele,i){
							// console.log(ele)
							( ele > -1 ) ? whichToShow[i] = true : whichToShow[i] = false;
						})

            console.log("interimArray", interimArray)
            console.log("whichToShow", whichToShow)

            // THIS REMOVES MINIMAE STUCK BETWEEN TWO MAXIMAE
            // for (var i = 0; i < whichToShow.length - 2; i++) {

            //   removeValue = true;

            //   if (maximae.hasOwnProperty(i) && minimae.hasOwnProperty(i+1) && maximae.hasOwnProperty(i+2)) {

            //     dontRemoveTheseMinima.forEach(function(val){ 
            //       if (val == i + 1) removeValue = false;
            //     })

            //     if (removeValue) whichToShow[i+1] = false;

            //   }
            // }

            return whichToShow;

        }
        , forceY = [0] // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
        , color = nv.utils.defaultColor()
        , showValues = false
        , showLocalMaxMinValuesOnly = false
        , valueFormat = d3.format(',.2f')
        , xDomain
        , yDomain
        , xRange
        , yRange
        , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout','renderEnd')
        , rectClass = 'discreteBar'
        , duration = 250
        ;

    //============================================================
    // Private Variables
    //------------------------------------------------------------
    var x0, y0;
    var renderWatch = nv.utils.renderWatch(dispatch, duration);

    function chart(selection) {
        renderWatch.reset();

        if (showLocalMaxMinValuesOnly) showValues = true;

        selection.each(function(data) {
            var availableWidth = width - margin.left - margin.right,
                availableHeight = height - margin.top - margin.bottom,
                container = d3.select(this);
            nv.utils.initSVG(container);

            //add series index to each data point for reference
            data.forEach(function(series, i) {
                series.values.forEach(function(point) {
                    point.series = i;
                });
            });

            // Setup Scales
            // remap and flatten the data for use in calculating the scales' domains
            var seriesData = (xDomain && yDomain) ? [] : // if we know xDomain and yDomain, no need to calculate
                data.map(function(d) {
                    return d.values.map(function(d,i) {
                        return { x: getX(d,i), y: getY(d,i), y0: d.y0 }
                    })
                });
            x   .domain(xDomain || d3.merge(seriesData).map(function(d) { return d.x }))
                .rangeBands(xRange || [0, availableWidth], .1);
            y   .domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.y }).concat(forceY)));

            // If showValues, pad the Y axis range to account for label height
            if (showValues) y.range(yRange || [availableHeight - (y.domain()[0] < 0 ? 12 : 0), y.domain()[1] > 0 ? 12 : 0]);
            else y.range(yRange || [availableHeight, 0]);

            //store old scales if they exist
            x0 = x0 || x;
            y0 = y0 || y.copy().range([y(0),y(0)]);

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-discretebar').data([data]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-discretebar');
            var gEnter = wrapEnter.append('g');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-groups');
            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            //TODO: by definition, the discrete bar should not have multiple groups, will modify/remove later
            var groups = wrap.select('.nv-groups').selectAll('.nv-group')
                .data(function(d) { return d }, function(d) { return d.key });
            groups.enter().append('g')
                .style('stroke-opacity', 1e-6)
                .style('fill-opacity', 1e-6);
            groups.exit()
                .watchTransition(renderWatch, 'discreteBar: exit groups')
                .style('stroke-opacity', 1e-6)
                .style('fill-opacity', 1e-6)
                .remove();
            groups
                .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
                .classed('hover', function(d) { return d.hover });
            groups
                .watchTransition(renderWatch, 'discreteBar: groups')
                .style('stroke-opacity', 1)
                .style('fill-opacity', .75);

            var bars = groups.selectAll('g.nv-bar')
                .data(function(d) { return d.values });
            bars.exit().remove();

            var barsEnter = bars.enter().append('g')
                .attr('transform', function(d,i,j) {
                    return 'translate(' + (x(getX(d,i)) + x.rangeBand() * .05 ) + ', ' + y(0) + ')'
                })
                .on('mouseover', function(d,i) { //TODO: figure out why j works above, but not here
                    d3.select(this).classed('hover', true);
                    dispatch.elementMouseover({
                        value: getY(d,i),
                        point: d,
                        series: data[d.series],
                        pos: [x(getX(d,i)) + (x.rangeBand() * (d.series + .5) / data.length), y(getY(d,i))],  // TODO: Figure out why the value appears to be shifted
                        pointIndex: i,
                        seriesIndex: d.series,
                        e: d3.event
                    });
                })
                .on('mouseout', function(d,i) {
                    d3.select(this).classed('hover', false);
                    dispatch.elementMouseout({
                        value: getY(d,i),
                        point: d,
                        series: data[d.series],
                        pointIndex: i,
                        seriesIndex: d.series,
                        e: d3.event
                    });
                })
                .on('click', function(d,i) {
                    dispatch.elementClick({
                        value: getY(d,i),
                        point: d,
                        series: data[d.series],
                        pos: [x(getX(d,i)) + (x.rangeBand() * (d.series + .5) / data.length), y(getY(d,i))],  // TODO: Figure out why the value appears to be shifted
                        pointIndex: i,
                        seriesIndex: d.series,
                        e: d3.event
                    });
                    d3.event.stopPropagation();
                })
                .on('dblclick', function(d,i) {
                    dispatch.elementDblClick({
                        value: getY(d,i),
                        point: d,
                        series: data[d.series],
                        pos: [x(getX(d,i)) + (x.rangeBand() * (d.series + .5) / data.length), y(getY(d,i))],  // TODO: Figure out why the value appears to be shifted
                        pointIndex: i,
                        seriesIndex: d.series,
                        e: d3.event
                    });
                    d3.event.stopPropagation();
                });

            barsEnter.append('rect')
                .attr('height', 0)
                .attr('width', x.rangeBand() * .9 / data.length )

            if (showValues) {

                barsEnter.append('text')
                    .attr('text-anchor', 'middle')
                ;

                var whichToShow = Array.apply(null, Array(data[0].values.length)).map(function(){return true;}); 

                if (showLocalMaxMinValuesOnly){
                  whichToShow = obtainMinimaeAndMaximae(data[0].values.map(function(datum){ return datum.value; }));
                }

                bars.select('text')
                    .text(function(d,i) { 
                      if (whichToShow[i]){
                        return valueFormat(getY(d,i));
                      } else {
                        return "";
                      }
                    })
                    .watchTransition(renderWatch, 'discreteBar: bars text')
                    .attr('x', x.rangeBand() * .9 / 2)
                    .attr('y', function(d,i) { return getY(d,i) < 0 ? y(getY(d,i)) - y(0) + 12 : -4 })

                ;
            } else {
                bars.selectAll('text').remove();
            }

            bars
                .attr('class', function(d,i) { return getY(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive' })
                .style('fill', function(d,i) { return d.color || color(d,i) })
                .style('stroke', function(d,i) { return d.color || color(d,i) })
                .select('rect')
                .attr('class', rectClass)
                .watchTransition(renderWatch, 'discreteBar: bars rect')
                .attr('width', x.rangeBand() * .9 / data.length);
            bars.watchTransition(renderWatch, 'discreteBar: bars')
                //.delay(function(d,i) { return i * 1200 / data[0].values.length })
                .attr('transform', function(d,i) {
                    var left = x(getX(d,i)) + x.rangeBand() * .05,
                        top = getY(d,i) < 0 ?
                            y(0) :
                                y(0) - y(getY(d,i)) < 1 ?
                            y(0) - 1 : //make 1 px positive bars show up above y=0
                            y(getY(d,i));

                    return 'translate(' + left + ', ' + top + ')'
                })
                .select('rect')
                .attr('height', function(d,i) {
                    return  Math.max(Math.abs(y(getY(d,i)) - y((yDomain && yDomain[0]) || 0)) || 1)
                });


            //store old scales for use in transitions on update
            x0 = x.copy();
            y0 = y.copy();

        });

        renderWatch.renderEnd('discreteBar immediate');
        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:   {get: function(){return width;}, set: function(_){width=_;}},
        height:  {get: function(){return height;}, set: function(_){height=_;}},
        forceY:  {get: function(){return forceY;}, set: function(_){forceY=_;}},
        showValues: {get: function(){return showValues;}, set: function(_){showValues=_;}},
        showLocalMaxMinValuesOnly: {get: function(){return showLocalMaxMinValuesOnly;}, set: function(_){showLocalMaxMinValuesOnly=_;}},
        x:       {get: function(){return getX;}, set: function(_){getX=_;}},
        y:       {get: function(){return getY;}, set: function(_){getY=_;}},
        xScale:  {get: function(){return x;}, set: function(_){x=_;}},
        yScale:  {get: function(){return y;}, set: function(_){y=_;}},
        xDomain: {get: function(){return xDomain;}, set: function(_){xDomain=_;}},
        yDomain: {get: function(){return yDomain;}, set: function(_){yDomain=_;}},
        xRange:  {get: function(){return xRange;}, set: function(_){xRange=_;}},
        yRange:  {get: function(){return yRange;}, set: function(_){yRange=_;}},
        valueFormat:    {get: function(){return valueFormat;}, set: function(_){valueFormat=_;}},
        id:          {get: function(){return id;}, set: function(_){id=_;}},
        rectClass: {get: function(){return rectClass;}, set: function(_){rectClass=_;}},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = _.top    !== undefined ? _.top    : margin.top;
            margin.right  = _.right  !== undefined ? _.right  : margin.right;
            margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   !== undefined ? _.left   : margin.left;
        }},
        color:  {get: function(){return color;}, set: function(_){
            color = nv.utils.getColor(_);
        }},
        duration: {get: function(){return duration;}, set: function(_){
            duration = _;
            renderWatch.reset(duration);
        }}
    });

    nv.utils.initOptions(chart);

    return chart;
};
