/**
 * Created by Nick on 8/13/2016.
 */

function draw(donationData, employeeData, nameOverride, donationsJson) {
    var donorCount = d3.nest().key(function(d){return d.donor}).entries(donationData).length;
    
    donationData = parseDateAll(donationData, "date");
    var endDate = parseDateEasy("8/24/2016 18:00");
//    donationData = donationData.filter(function(d){return new Date(d.date) <= endDate});
    var dollarTarget = 5772;
    var tankSpots = 10;

    $("#end-date").text(d3.time.format("%A, %B %e at %I:%M %p")(endDate));

    var secondsLeft = (endDate-new Date())/1000;
    var timerUpdate = setInterval(function(){
        if (new Date()<=endDate) {
            secondsLeft = (endDate-new Date())/1000;
            var days = Math.floor(secondsLeft/(60*60*24));
            var hours = Math.floor((secondsLeft-(days*60*60*24))/(60*60));
            var minutes = Math.floor((secondsLeft-(days*60*60*24+hours*60*60))/60);
            var seconds = Math.floor((secondsLeft-(days*60*60*24+hours*60*60+minutes*60)));

            var html = "<span class='countdown-num'>"+days+"</span>D "
                + "<span class='countdown-num'>"+hours+"</span>H "
                + "<span class='countdown-num'>"+minutes+"</span>M "
                + "<span class='countdown-num'>"+seconds+"</span>S";

            $("#countdown").html(html);
        } else {
            $("#countdown").html("<span class='countdown-num'>Bidding closed!!</span>");
            $("#countdown-sub").html("Continue to donate to add more balls and increase the chances of a dunk! <br/>Donate $100 exactly to guarantee a dunk! <br/>Live donations will continue at Kimball Farms for all sorts of bonuses, so come ready!");
        }

    }, 1000);

    var employeeCount = employeeData.length;
    var size = 218;

    $(window).resize(function(){ resizeLeaderboard() });

    resizeLeaderboard();

    function resizeLeaderboard() {
        $("#leaderboard").css("width", Math.max(size, ($(".leaderboard-holder").width() *.8))+"px");
        $("#leaderboard").css("margin-left", ($("#leaderboard").width()<size+40?0:$("#leaderboard").width()%size/2)+"px")
            .css("width", (Math.floor($("#leaderboard").width()/size)*size)+"px");
    }

    var titleMap = {}, picMap = {}, slackMap = {}, middleMap = {}, nameList = [];
    employeeData.forEach(function(d){
        nameList.push(d.Name);
        titleMap[d.Name.toLowerCase()] = d.Title;
        picMap[d.Name.toLowerCase()] = d["Image Location"];
        slackMap[d.Name.toLowerCase()] = d["Slack Handle"];
        middleMap[d.Name.toLowerCase()] = d["Middle"];
    });

    var fuzzy = FuzzySet(nameList);

    var nameMap = {};
    nameOverride.forEach(function(d){
        nameMap[d.typed.toLowerCase()] = d.real;
    });

    var nameMatches = [];
    donationData.forEach(function(d){
        var names = fuzzy.get(d.name);
        if (typeof names != 'undefined' && names.length>0) {
            names.sort(function(a,b){return d3.descending(a[0], b[0])});
            d.matchedName = names[0][1];
            nameMatches.push({orig: d.name, matched: d.matchedName, pct: names[0][0]});
        } else {
            d.matchedName = d.name;
            nameMatches.push({orig: d.name, matched: '', pct: 0});
        }
    });
    console.log(nameMatches);

    var leaderNest = d3.nest().key(function(d){return d.matchedName}).entries(donationData);
    leaderNest.forEach(function(d){
        d.count = d.values.length;
        d.amt = d3.sum(d.values.filter(function(dd){return new Date(dd.date) <= endDate}), function(dd){return dd.amt});
        d.totalAmount = d3.sum(d.values, function(dd){return dd.amt});
        d.dunkNow = d.values.filter(function(dd){return new Date(dd.date) > endDate && dd.amt == 100}).length>=1;
        d.name = d.key;
        d.name = typeof nameMap[d.name.toLowerCase()]=='undefined'? d.name:nameMap[d.name.toLowerCase()];
        d.title = typeof titleMap[d.name.toLowerCase()]=='undefined'?"Chief Dunking Officer":titleMap[d.name.toLowerCase()];
        d.img = typeof picMap[d.name.toLowerCase()]=='undefined'?"http://vignette2.wikia.nocookie.net/ronaldmcdonald/images/a/a9/Grimace.jpg":picMap[d.name.toLowerCase()];
        d.slack = typeof slackMap[d.name.toLowerCase()]=='undefined'?"":slackMap[d.name.toLowerCase()];

        d.heat = d3.sum(d.values, function(dd){return Math.max(0, 1-(new Date()- new Date(dd.date))/(1000*60*60*24))});
        d.donationsIn24 = d.values.filter(function(dd){return (new Date()- new Date(dd.date))/(1000*60*60*24)<1}).length;

        d.balls = 5+Math.floor((d.totalAmount-d.amt)/5)*3;

    });

    var totalAmt = d3.sum(leaderNest, function(d){return d.amt});
    var pctToTgt = formatPct(Math.min(totalAmt/dollarTarget,1));
    tankSpots = dollarTarget>totalAmt?10:15;

//    CALCULATE STATS
    var donorCount = d3.nest().key(function(d){return d.donor}).entries(donationData).length;

//    CALCULATE STATS
    $("#stat-pct-donated").text(formatPct(donorCount/employeeData.length));
    $("#stat-pct-donated-text").text(pctToTgt);
    $("#progress-marker").text(pctToTgt);
    $("#progress-marker").css("left", pctToTgt);
    $("#progress-bar").css("width", pctToTgt);
    $("#progress-bar-text-target").text(formatCurrency(dollarTarget));

    $("#stat-arcadians-nominated").text(formatInt(leaderNest.length));
    $("#stat-donations-made").text(formatInt(donationData.length));
    $("#stat-money-raised").text(formatCurrency(d3.sum(leaderNest, function(d){return d.totalAmount})));

    if (totalAmt>=dollarTarget) {
        d3.select("#progress-bar-text").html("")
            .append("p").append("strong")
            .text("YES!! We've hit " + formatCurrency(dollarTarget) + " and unlocked an additional 5 spots on the tank!!")
    }

    leaderNest.sort(function(a,b){return d3.descending(a.amt, b.amt)});

    var maxAmt = d3.max(leaderNest, function(d){return d.amt});
    var qualAmt = leaderNest[leaderNest.length>tankSpots?(tankSpots-1):(leaderNest.length-1)].amt;

    var degScale = d3.scale.linear()
        .range([0,270])
        .domain([0, maxAmt]);

    var heatColorScale = d3.scale.linear()
        .range(['#ff9800', '#f44336'])
        .domain(d3.extent(leaderNest, function(d){return d.heat}));
    var heatOpacityScale = d3.scale.linear()
        .range([.3,1])
        .domain(d3.extent(leaderNest, function(d){return d.heat}));

    var div = d3.select("#leaderboard").html("");

    leaderNest.forEach(function(d,i){
//        var size = $("#leaderboard").width()/4.1;
        var circleScale = .6;

        var lDiv = div.append("div").attr("class","leader").style("width", size+"px");
        var flameOffset = {x: 32, y: -64};

        var titleDiv = lDiv.append("div").attr("class","title-holder").style("width","100%");
        var name = titleDiv.append("p").attr("class","leader-name").text(d.name);
        var title = titleDiv.append("p").attr("class","leader-title").text(d.title);

        var circleHolder = lDiv.append("a").attr("href", "https://www.crowdrise.com/ArcadiaDunksforMeals").attr("target", "_blank").append("div").attr("class","center-align circle-holder clickable tooltipped")
            .attr("data-tooltip", function() { return getTooltip(); })
            .attr("data-position", "top")
            .on("mouseover", function(){
                d3.select(this).selectAll(".tgt-circle").transition().attr("r", 8);
                d3.select(this).selectAll(".pos-circle").transition().attr("r", 24);
                d3.select(this).selectAll(".flame").transition().attr("width", 48);
                d3.select(this).selectAll(".flame-holder").transition()
                    .attr("transform","translate("+((size*circleScale *.5)+endX+flameOffset.x-12)+", "+((size*circleScale *.5)+endY+flameOffset.y-12)+")");
            })
            .on("mouseout", function(){
                d3.select(this).selectAll(".tgt-circle").transition().attr("r", 4);
                d3.select(this).selectAll(".pos-circle").transition().attr("r", 12);
                d3.select(this).selectAll(".flame").transition().attr("width", 24);
                d3.select(this).selectAll(".flame-holder").transition()
                    .attr("transform","translate("+((size*circleScale *.5)+endX+flameOffset.x)+", "+((size*circleScale *.5)+endY+flameOffset.y)+")");
            });

        var arcWidth = 8;

        var pic = circleHolder.append("div").attr("class","pic-holder")
            .style("background-image", "url('"+ d.img + "')")
            .style("width", (size*circleScale-arcWidth*2)+"px").style("height", (size*circleScale-arcWidth*2)+"px").style("border-radius", (size*circleScale-arcWidth*2)+"px")
            .style("margin-left", (size *.5*(1-circleScale)+arcWidth)+"px").style("margin-top", arcWidth+"px");

        var statsDiv = lDiv.append("div").attr("class","stats-holder").style("width","100%");
        var total = statsDiv.append("p").attr("class","leader-total light-blue-text text-accent-4").text(formatCurrency(d.amt));
        var donations = statsDiv.append("p").attr("class","leader-donations grey-text text-darken-2").text("("+formatInt(d.count)+" donations)");

//        DRAW DONUT
        var svg = circleHolder.append("svg").attr("class","donut-holder")
            .style("width", size+"px").style("height",size+"px");
        var pathG = svg.append("g")
            .attr("transform", "translate("+(size *.5*(1-circleScale))+", 0)");


        var arc = d3.svg.arc()
            .innerRadius(size*circleScale *.5-arcWidth)
            .outerRadius(size*circleScale *.5)
            .startAngle(0*(Math.PI/180))
            .endAngle(degScale(d.amt)*(Math.PI/180));

        pathG.append("path")
            .attr("class","donut")
            .style("fill", d.amt>=qualAmt?'#81c784':'#90a4ae')
            .attr("d",arc)
            .attr("transform", "translate("+(size*circleScale *.5)+","+(size*circleScale *.5)+")");

        function getXY(n) {
            return {x: Math.sin(degScale(n)*(Math.PI/180))*(size*circleScale *.5-arcWidth *.5)
                , y: 0-Math.cos(degScale(n)*(Math.PI/180))*(size*circleScale *.5-arcWidth *.5)}
        }

        var endX = getXY(d.amt).x, endY = getXY(d.amt).y
            , tgtX = getXY(qualAmt).x, tgtY = getXY(qualAmt).y;

//        if (d.heat > 0) {
//            circleHolder.append("div")
//                .attr("class","fire-circle")
//                .style("color", heatColorScale(d.heat))
//                .style("opacity", heatOpacityScale(d.heat))
//                .append("i").attr("class","material-icons").text("whatshot");
//        }


        if (d.heat>0) {
            var flameG = svg.append("g").attr("class","flame-holder")
                .attr("transform","translate("+((size*circleScale *.5)+endX+flameOffset.x)+", "+((size*circleScale *.5)+endY+flameOffset.y)+")");
            d3.xml("https://9e4431f4eec64bc5b421d99d8e837fb5517ab105.googledrive.com/host/0B76-5MQsSdKxVFc3TW5uSEdfZlE/flame.svg")
                .mimeType("image/svg+xml").get(function(error, xml) {
                    if (error) throw error;
                    var flameSvg = xml.getElementsByTagName("svg")[0];
                    flameG.node().appendChild(flameSvg);
                    var thisFlame = flameG.select("svg").attr("class","flame");
                    thisFlame.attr("width",24).attr("height",100);
                    thisFlame.style("fill", heatColorScale(d.heat))
//                        .style("opacity",heatOpacityScale(d.heat))
                    ;

                });
        }

        var circleG = svg.append("g")
            .attr("transform", "translate("+(size *.5*(1-circleScale))+", 0)");

        var tgtCircle = circleG.append("circle").attr("class","tgt-circle")
            .attr("r", 4)
            .attr("cx", (size*circleScale *.5)+tgtX)
            .attr("cy", (size*circleScale *.5)+tgtY)
            .style("fill", '#81c784')
            .style("stroke", "#FFF").style("stroke-width", "1px");

        var circle = circleG.append("circle").attr("class","pos-circle")
            .attr("r", 12)
            .attr("cx", (size*circleScale *.5)+endX)
            .attr("cy", (size*circleScale *.5)+endY)
            .style("fill", function() {
                    if (d.heat>0) {
                        return heatColorScale(d.heat);
                    } else {
                        return d.amt>=qualAmt?'#00c853':'#607d8b'
                    }
                }
            )
            .style("stroke", "#FFF").style("stroke-width", "1px");

        var text = circleG.append("text").attr("class","leaderboard-number")
            .classed("fire-number", d.heat>0)
            .attr("dx", (size*circleScale *.5)+endX)
            .attr("dy", (size*circleScale *.5)+endY+5)
            .attr("text-anchor", "middle")
            .text(""+(i+1));


//        LEADERBOARD SUMMARY
        if (leaderNest.length<4) {
            d3.select(".leaderboard-summary ").classed("hidden",true);
        } else {
            var barW = 36, barP = 24, barH = 162, circleR = 24;

            var yScale = d3.scale.linear()
                .range([circleR*2,barH])
                .domain([0,maxAmt]);

            var barBgDiv = d3.select("#leaderboard-summary-scroll").style("height", (barH+circleR/2)+"px").append("div")
                .attr("class","leaderboard-summary-bar bg-bar")
                .style("border-radius", barW+"px")
                .style("left", i*(barW+barP)+"px").style("width", barW+"px")
                .style("top", 0).style("height", barH+"px");

            var barInnerDiv = d3.select("#leaderboard-summary-scroll").style("height", (barH+circleR)+"px").append("div")
                .attr("class","leaderboard-summary-bar")
                .classed("top-performer", d.amt>=qualAmt)
                .style("border-radius", barW+"px")
                .style("left", i*(barW+barP)+"px").style("width", barW+"px")
                .style("top", (barH-yScale(d.amt))+"px").style("height", yScale(d.amt)+"px");

            var barIcon = d3.select("#leaderboard-summary-scroll").append("a").attr("href", "https://www.crowdrise.com/ArcadiaDunksforMeals").attr("target","blank")
                .append("div")
                .attr("class","leaderboard-img clickable tooltipped")
                .style("border-radius",  barW+"px")
                .style("left", i*(barW+barP)+"px").style("width", barW+"px")
                .style("top", (barH-barW)+"px").style("height", barW+"px")
                .style("background-image", "url('"+ d.img + "')")
                .attr("data-tooltip", function() { return getTooltip(); })
                .attr("data-position", "top");
        }



        function getTooltip() {
            var firstName = d.name.substr(0, d.name.indexOf(" "));
            var tooltip = d.name + ": " + formatCurrency(d.amt);
            tooltip = tooltip + "\n" + "To Qualify: " + formatCurrency(qualAmt) + "\n" + "\n";
            if (d.amt > qualAmt) {
                tooltip = tooltip + "YES!! " + firstName + " currently qualifies for the Dunk Tank by " + formatCurrency(d.amt-qualAmt) + "!!"
                    + "\n" + "Donate more to ensure " + firstName + "'s spot on the tank!";
            } else if (d.amt == qualAmt) {
                tooltip = tooltip + firstName + " is just BARELY qualifying!"
                    + "\n" + "Donate more to ensure " + firstName + "'s spot on the tank!";
            } else {
                tooltip = tooltip + "Uh oh! " + firstName + " needs " + formatCurrency(qualAmt-d.amt) + " more in donations to qualify!"
                    + "\n" + "What are you waiting for?! Go donate!";
            }
            if (d.heat > 0 && d.donationsIn24 > 1) {
                tooltip = tooltip + "\n \n" + firstName.toUpperCase() + " IS ON FIRE!! " + formatInt(d.donationsIn24) + " donation in the past 24 hours!"
            } else if (d.heat > 0 && d.donationsIn24 == 1) {
                tooltip = tooltip + "\n \n" + firstName + " is heating up! " + formatInt(d.donationsIn24) + " donation in the past 24 hours!"
            }
            return tooltip
        }
    });


//    DONATION HISTORY
    var dateExtent = d3.extent(donationData, function(d){return new Date(d.date)});
    var daySpan = (dateExtent[1]-dateExtent[0])/(1000*60*60*24);
    var xPerDay = 200
        , rSize = 18
        , ySize = 600;
    var donationHxCanvas = d3.select("#donation-history").style("width", (xPerDay*daySpan+(rSize*2))+"px").style("height", (ySize+(rSize*4))+"px");
    var xTimeScale = d3.scale.linear()
        .range([rSize, rSize+(xPerDay*daySpan)])
        .domain(dateExtent);
    var yScale = d3.scale.linear()
        .range([rSize+ySize, rSize*4])
        .domain([0, d3.max(donationData, function(d){return d.amt})]);

    leaderNest.forEach(function(d,i){
        d.values.forEach(function(dd){

            var donationCircle = donationHxCanvas.append("div")
                .attr("class","donation clickable tooltipped donation-target-"+i)
                .style("background-image", "url('"+ d.img + "')")
                .style("left", xTimeScale(new Date(dd.date))+"px")
                .style("top", yScale(dd.amt)+"px")
                .attr("data-tooltip", function(){
                    return d.name + "\n\n" + formatCurrency(dd.amt) + " donated \n on " + d3.time.format("%A, %B %e at %I:%M %p")(new Date(dd.date));
                }).attr("data-position", "top")
                .on("mouseover", function(){donationHxCanvas.selectAll(".donation-target-"+i).classed("hover",true)})
                .on("mouseout", function(){donationHxCanvas.selectAll(".donation-target-"+i).classed("hover",false)});
        });
    });

//    HORSE RACE
    var horseRaceCanvas = d3.select("#horse-race").style("width", (xPerDay*daySpan+(rSize*2))+"px").style("height", (ySize+(rSize*4))+"px");
    var horseRaceSvg = horseRaceCanvas
        .append("svg").style("width", (xPerDay*daySpan+(rSize*2))+"px").style("height", (ySize+(rSize*4))+"px");

    var cumYScale = d3.scale.linear()
        .range([rSize+ySize, rSize*4])
        .domain([0, d3.max(leaderNest, function(d){return d.amt})]);

    var line = d3.svg.line()
        .x(function(d){return xTimeScale(new Date(d.date))})
        .y(function(d){return cumYScale(d.amt)});

    leaderNest.forEach(function(d){
        var trendData = [];
        donationData.forEach(function(dd){
            trendData.push({
                date: new Date(dd.date)
                , amt: d3.sum(d.values.filter(function(ddd){return new Date(ddd.date)<=new Date(dd.date)}), function(ddd){return +ddd.amt})
            });
        });
        d.trendData = trendData;
    });

    leaderNest.forEach(function(d,i){
        horseRaceSvg.append("path")
            .datum(d.trendData)
            .attr("class","line leader leader-"+i)
            .classed("top-rank", d.amt>=qualAmt)
            .attr("d",line)
            .on("mouseover", function(){horseRaceCanvas.selectAll(".leader-"+i).classed("hover",true)})
            .on("mouseout", function(){horseRaceCanvas.selectAll(".leader-"+i).classed("hover",false)});


        d.values.forEach(function(dd){
            var cumAmt = d3.sum(d.values.filter(function(ddd){return new Date(ddd.date)<=new Date(dd.date)}), function(ddd){return +ddd.amt});
            var donationCircle = horseRaceCanvas.append("div")
                .attr("class","donation clickable tooltipped leader leader-"+i)
                .style("background-image", "url('"+ d.img + "')")
                .style("left", xTimeScale(new Date(dd.date))+"px")
                .style("top", cumYScale(cumAmt)+"px")
                .attr("data-position", "top")
                .attr("data-tooltip", function(){
                    return d.name + "\n\n" + formatCurrency(dd.amt) + " donated \n on " + d3.time.format("%A, %B %e at %I:%M %p")(new Date(dd.date))
                        + "\n for a total of " + formatCurrency(cumAmt);
                })
                .on("mouseover", function(){horseRaceCanvas.selectAll(".leader-"+i).classed("hover",true)})
                .on("mouseout", function(){horseRaceCanvas.selectAll(".leader-"+i).classed("hover",false)});
        });

        var finalDonationCircle = horseRaceCanvas.append("div")
            .attr("class","donation clickable tooltipped leader leader-"+i)
            .style("background-image", "url('"+ d.img + "')")
            .style("left", xTimeScale(dateExtent[1])+"px")
            .style("top", cumYScale(d.amt)+"px")
            .attr("data-position", "top")
            .attr("data-tooltip", function(){
                return d.name + "\n\n Current Rank: " + (i+1) + "\nTotal Donated: " + formatCurrency(d.amt);
            })
            .on("mouseover", function(){horseRaceCanvas.selectAll(".leader-"+i).classed("hover",true)})
            .on("mouseout", function(){horseRaceCanvas.selectAll(".leader-"+i).classed("hover",false)});
    });


    var daySpanStart = new Date(dateExtent[0]);
    for (i=0; i<Math.ceil(daySpan); i++) {
        var daySpanEnd = d3.min([new Date(daySpanStart.getFullYear(), daySpanStart.getMonth(), daySpanStart.getDate(), 23,59,59), new Date(dateExtent[1])]);

        donationHxCanvas.append("div").attr("class","date-label")
            .style("left",(xTimeScale(daySpanStart)+rSize)+"px")
            .style("width", (xTimeScale(daySpanEnd)-xTimeScale(daySpanStart))+"px")
            .style("top",(ySize+rSize*2)+"px")
            .text(d3.time.format("%A, %B %e")(new Date(daySpanStart)));

        horseRaceCanvas.append("div").attr("class","date-label")
            .style("left",(xTimeScale(daySpanStart)+rSize)+"px")
            .style("width", (xTimeScale(daySpanEnd)-xTimeScale(daySpanStart))+"px")
            .style("top",(ySize+rSize*2)+"px")
            .text(d3.time.format("%A, %B %e")(new Date(daySpanStart)));
        daySpanStart = new Date(daySpanStart.getFullYear(), daySpanStart.getMonth(), daySpanStart.getDate()+1, 0,0,0);
    }


//    DRAW BALLS

    var maxBalls = d3.max(leaderNest, function(d){return d.balls})+1;
    var totalW = 240+60+120+120+60+(maxBalls*16);
    var ballAllotmentHolder = d3.select("#ball-allotment-holder");

    var ballHeader = ballAllotmentHolder.append("div").attr("class","table-row strong").style("width", totalW+"px");
    ballHeader.append("div").attr("class","table-cell left-align").style("width","240px").text("Name");
    ballHeader.append("div").attr("class","table-cell").style("width","60px").text("Rank");
    ballHeader.append("div").attr("class","table-cell").style("width","120px").text("$ Before 6p");
    ballHeader.append("div").attr("class","table-cell").style("width","120px").text("$ After 6p");
    ballHeader.append("div").attr("class","table-cell").style("width","60px").text("Balls");

    leaderNest.forEach(function(d,i){
        var balls = 5+Math.floor((d.totalAmount-d.amt)/5)*3;
        var thisBallHolder = ballAllotmentHolder.append("div").attr("class","table-row").style("width", totalW+"px");
        thisBallHolder.append("div").attr("class","table-cell left-align strong").style("width","240px").text(d.name);
        thisBallHolder.append("div").attr("class","table-cell").style("width","60px").text(formatInt(i+1));
        thisBallHolder.append("div").attr("class","table-cell").style("width","120px").text(formatCurrency(d.amt));
        thisBallHolder.append("div").attr("class","table-cell").style("width","120px").text(formatCurrency(d.totalAmount-d.amt));
        if (d.amt>=qualAmt) {
            thisBallHolder.append("div").attr("class","table-cell").style("width","60px").text(formatInt(balls));
            var ballsGraphic = thisBallHolder.append("div").attr("class","table-cell")
                .style("width",((balls+1)*16)+"px");
            if (d.dunkNow) {
                ballsGraphic.append("div").attr("class","ball dunk-now tooltipped clickable")
                    .attr("data-position","top")
                    .attr("data-tooltip", "Yes! With a donation of $100 \nafter the close of the bidding," +
                        "\n" + d.name + " qualifies for an ON-DEMAND DUNK!!");
            }
            for (i=0;i<balls;i++) {
                ballsGraphic.append("div").attr("class","ball");
            }
        }
    });

    if (new Date() <= endDate) {d3.select("#ball-allotment-section").classed("hidden",true);}

    $('.tooltipped').tooltip({delay: 50});



}