/**
 * Created by Nick on 8/13/2016.
 */

function draw(donationData, employeeData, nameOverride, donationsJson) {
    var donorCount = d3.nest().key(function(d){return d.donor}).entries(donationData).length;
    
    donationData = parseDateAll(donationData, "date");
    var endDate = parseDateEasy("8/24/2016 18:00");

    $("#end-date").text(d3.time.format("%A, %B %e at %I:%M %p")(endDate));

    var secondsLeft = (endDate-new Date())/1000;
    var timerUpdate = setInterval(function(){
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
        d.amt = d3.sum(d.values, function(d){return d.amt});
        d.name = d.key;
        d.name = typeof nameMap[d.name.toLowerCase()]=='undefined'? d.name:nameMap[d.name.toLowerCase()];
        d.title = typeof titleMap[d.name.toLowerCase()]=='undefined'?"Chief Dunking Officer":titleMap[d.name.toLowerCase()];
        d.img = typeof picMap[d.name.toLowerCase()]=='undefined'?"http://vignette2.wikia.nocookie.net/ronaldmcdonald/images/a/a9/Grimace.jpg":picMap[d.name.toLowerCase()];
        d.slack = typeof slackMap[d.name.toLowerCase()]=='undefined'?"":slackMap[d.name.toLowerCase()];

        d.heat = d3.sum(d.values, function(dd){return Math.max(0, 1-(new Date()- new Date(dd.date))/(1000*60*60*24))});
        d.donationsIn24 = d.values.filter(function(dd){return (new Date()- new Date(dd.date))/(1000*60*60*24)<1}).length;

    });

    leaderNest.sort(function(a,b){return d3.descending(a.head, b.heat);});

//    CALCULATE STATS
    var donorCount = d3.nest().key(function(d){return d.donor}).entries(donationData).length;

//    CALCULATE STATS
    $("#stat-pct-donated").text(formatPct(donorCount/employeeData.length));
    $("#stat-pct-donated-text").text(formatPct(donorCount/employeeData.length));
    $("#progress-marker").text(formatPct(donorCount/employeeData.length));
    $("#progress-marker").css("left", formatPct(donorCount/employeeData.length));
    $("#progress-bar").css("width", formatPct(donorCount/employeeData.length));

    $("#stat-arcadians-nominated").text(formatInt(leaderNest.length));
    $("#stat-donations-made").text(formatInt(donationData.length));
    $("#stat-money-raised").text(formatCurrency(d3.sum(leaderNest, function(d){return d.amt})));

    leaderNest.sort(function(a,b){return d3.descending(a.amt, b.amt)});

    var maxAmt = d3.max(leaderNest, function(d){return d.amt});
    var qualAmt = leaderNest[leaderNest.length>10?9:(leaderNest.length-1)].amt;

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

        var titleDiv = lDiv.append("div").attr("class","title-holder").style("width","100%");
        var name = titleDiv.append("p").attr("class","leader-name").text(d.name);
        var title = titleDiv.append("p").attr("class","leader-title").text(d.title);

        var circleHolder = lDiv.append("a").attr("href", "https://www.crowdrise.com/ArcadiaDunksforMeals").attr("target", "_blank").append("div").attr("class","center-align circle-holder clickable tooltipped")
            .attr("data-tooltip", function() { return getTooltip(); })
            .attr("data-position", "top")
            .on("mouseover", function(){
                d3.select(this).selectAll(".tgt-circle").transition().attr("r", 12);
                d3.select(this).selectAll(".pos-circle").transition().attr("r", 24);
            })
            .on("mouseout", function(){
                d3.select(this).selectAll(".tgt-circle").transition().attr("r", 6);
                d3.select(this).selectAll(".pos-circle").transition().attr("r", 12);
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
        var g = svg.append("g")
            .attr("transform", "translate("+(size *.5*(1-circleScale))+", 0)");


        var arc = d3.svg.arc()
            .innerRadius(size*circleScale *.5-arcWidth)
            .outerRadius(size*circleScale *.5)
            .startAngle(0*(Math.PI/180))
            .endAngle(degScale(d.amt)*(Math.PI/180));

        g.append("path")
            .attr("class","donut")
            .style("fill", d.amt>=qualAmt?'#81c784':'#ffb74d')
            .attr("d",arc)
            .attr("transform", "translate("+(size*circleScale *.5)+","+(size*circleScale *.5)+")");

        function getXY(n) {
            return {x: Math.sin(degScale(n)*(Math.PI/180))*(size*circleScale *.5-arcWidth *.5)
                , y: 0-Math.cos(degScale(n)*(Math.PI/180))*(size*circleScale *.5-arcWidth *.5)}
        }

        var endX = getXY(d.amt).x, endY = getXY(d.amt).y
            , tgtX = getXY(qualAmt).x, tgtY = getXY(qualAmt).y;

        if (d.heat > 0) {
            circleHolder.append("div")
                .attr("class","fire-circle")
                .style("color", heatColorScale(d.heat))
                .style("opacity", heatOpacityScale(d.heat))
                .append("i").attr("class","material-icons").text("whatshot");
        }

        var tgtCircle = g.append("circle").attr("class","tgt-circle")
            .attr("r", 6)
            .attr("cx", (size*circleScale *.5)+tgtX)
            .attr("cy", (size*circleScale *.5)+tgtY)
            .style("fill", '#b0bec5')
            .style("stroke", "#FFF").style("stroke-width", "1px");

        var circle = g.append("circle").attr("class","pos-circle")
            .attr("r", 12)
            .attr("cx", (size*circleScale *.5)+endX)
            .attr("cy", (size*circleScale *.5)+endY)
            .style("fill", d.amt>=qualAmt?'#00c853':'#ff6d00')
            .style("stroke", "#FFF").style("stroke-width", "1px");

        var text = g.append("text").attr("class","leaderboard-number")
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

    $('.tooltipped').tooltip({delay: 50});



}