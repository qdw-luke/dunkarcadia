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
    // .defer(d3.csv, "https://cors.io/?u=https://arcadia.box.com/shared/static/wvx8r3izv4s81nw0f7xyqkg779dxzv8w.csv") // DONATION DATA
    .defer(d3.csv, "https://9e4431f4eec64bc5b421d99d8e837fb5517ab105.googledrive.com/host/0B76-5MQsSdKxVFc3TW5uSEdfZlE/arcadia-dunk-data/employee_data.csv") // EMPLOYEE DATA
    .defer(d3.csv, "https://9e4431f4eec64bc5b421d99d8e837fb5517ab105.googledrive.com/host/0B76-5MQsSdKxVFc3TW5uSEdfZlE/arcadia-dunk-data/name_override.csv")
    .await(loadTrigger);

function loadTrigger(e, employees, nameOverride) {
    $.ajax({
      dataType: "json",
      url: '/crowdwise',
      success: function(data) {
        draw( prepDonationData(data), employees, nameOverride);
      }
    });    
}


var donatatioStub = $.getJSON('/crowdwise');

function prepDonationData(data) {
    var output = [];
    data.result[0].forEach(function(d){
        if (typeof d.CustomDonationQuestions[0] != 'undefined' && typeof d.CustomDonationQuestions[0].Answer != 'undefined')
        output.push({
           amt: d.Amount
           , name: d.CustomDonationQuestions[0].Answer
           , date: unixTimeConvert(d.TransactionDate)
           , donor: d.DonorLastName + ', ' + d.DonorFirstName
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