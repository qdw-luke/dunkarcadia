$("#explain-toggle").click(function(){
    if ($("#explainer").hasClass("hidden")) {
        $("#explain-toggle").text("Got it!");
        $("#explainer").removeClass("hidden");
    } else {
        $("#explain-toggle").text("What is it?");
        $("#explainer").addClass("hidden");
    }
});


queue()
//            .defer(d3.csv, "/data/donation_data.csv") // DONATION DATA
//            .defer(d3.csv, "/data/employee_data.csv") // EMPLOYEE DATA
    .defer(d3.csv, "http://cors.io/?u=https://arcadia.box.com/shared/static/wvx8r3izv4s81nw0f7xyqkg779dxzv8w.csv") // DONATION DATA
    .defer(d3.csv, "http://cors.io/?u=https://arcadia.box.com/shared/static/gqotcl15x0t8g09otxno5fpp8yv1ngsc.csv") // EMPLOYEE DATA
    .defer(d3.csv, "http://cors.io/?u=https://arcadia.box.com/shared/static/3furxn2kqsfbq0nbnr16pqmu70wzb4u5.csv")
    .await(loadTrigger);

function loadTrigger(e, donations, employees, nameOverride) {
    $.ajax({
      dataType: "json",
      url: '/crowdwise',
      success: function(data) {
        console.log(data);
        draw( prepDonationData(data), employees, nameOverride);
      }
    });    
}


var donatatioStub = $.getJSON('/crowdwise')

function prepDonationData(data) {
    var output = [];
    data.result[0].forEach(function(d){
        if (typeof d.CustomDonationQuestions[0] != 'undefined' && typeof d.CustomDonationQuestions[0].Answer != 'undefined')
        output.push({
            amt: d.Amount
            , name: d.CustomDonationQuestions[0].Answer
            , date: unixTimeConvert(d.TransactionDate)
        });
    });
    return output;
}


// ON PAGE LOAD
(function($){
    $(function(){
        // put any scripts to execute after the document is ready
        $('.tooltipped').tooltip({delay: 50});

    }); // end of document ready
})(jQuery); // end of jQuery name space