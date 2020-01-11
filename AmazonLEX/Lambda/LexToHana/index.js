//const sugerencias = require('./sugerencias');
'use strict';


function process_dimensions(slots){
    var Country = slots.Country;
    var Month = slots.Month;
    var Year = slots.Year;

    var numero = 0;
    if (Month == 'Janaury' || Month == 'janaury') numero = 1;
    else if (Month == 'February' || Month == 'february') numero = 2;
    else if (Month == 'May' || Month == 'may') numero = 3;
    else if (Month == 'April' || Month == 'april') numero = 4;
    else if (Month == 'June' || Month == 'june') numero = 5;
    else if (Month == 'July' || Month == 'july') numero = 6;
    else if (Month == 'Janaury' || Month == 'janaury') numero = 7;
    else if (Month == 'August' || Month == 'august') numero = 8;
    else if (Month == 'September' || Month == 'september') numero = 9;
    else if (Month == 'October' || Month == 'october') numero = 10;
    else if (Month == 'November' || Month == 'november') numero = 11;
    else numero = 12;

    var filter_string = new String();
    var primero = true;

    console.log(slots);

    if (Country != null) {
        filter_string = (`﻿Country eq '${Country}'`);
        primero = false;
    }
    if (Month != null && (numero >= 1 && numero <= 12)) {
        if (primero){
            filter_string += ('Month eq ');
            primero = false;
        }
        else filter_string += (' and Month eq ');
        filter_string += numero;
    }
    if (Year != null && (Year >= 2017 && Year <= 2019)) {
        if (primero){
            filter_string += ('Year eq ');
            primero = false;
        }
        else filter_string += (' and Year eq ');
        filter_string += Year;
    }
    return filter_string;
}

function postman_request(KPI, slots, callback) {
    var request = require("request");

    var dimensions = process_dimensions(slots);
    console.log(dimensions)
    var options = { method: 'GET',
        url: 'https://ajmac1bfe500.hana.ondemand.com/POC/service.xsodata/sales',
        qs:
            { '$format': 'json',
                '$filter': dimensions.replace("\\",""),
                '$select': KPI },
        headers:
            { 'cache-control': 'no-cache',
                Connection: 'keep-alive',
                'Accept-Encoding': 'utf8',
                Host: 'ajmac1bfe500.hana.ondemand.com',
                'Postman-Token': '0072164b-57c1-4bda-af44-1f685688d2a8,9046507a-c8a3-4398-a7ff-5480ed83e08f',                
                'Cache-Control': 'no-cache',
                 Accept: '*/*',
                 Authorization: 'Basic UE9DOnBvY0ZJQjAxMjM0NTY3ODk=' } };

    console.log(options);
    request(options, function (error, response, body) {
        if (error) console.log(error);
        var jsonbody = JSON.parse(body);
        console.log(`jsonbody ${jsonbody.d.results[0][KPI]}`);
        callback(jsonbody.d.results[0][KPI]);
    });
}

// Close dialog with the customer, reporting fulfillmentState of Failed or Fulfilled ("Thanks, your pizza will arrive in 20 minutes")
function close(sessionAttributes, fulfillmentState, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
        },
    };
}

/**
 * Envia a la base de datos de sugerencia la nueva consulta con KPI y valores
 * @param {JSON} values Valores de la consulta
 */
function sendKPI(values)
{    
    var request = require("request"); 
    request.post({
    headers: {'content-type' : 'application/json'},
    url:     'http://vps764501.ovh.net:3000/rcmnd',
    body:    values,
    json: true
    }, function(error, response, body){
        if(error)
            throw error;

    });
}

/**
 * Consulta de la base de datos 
 * @param {JSON} values Valores de la consulta
 */
function receiveSug(values)
{    
    console.log("entro en sugernecias")
    var request = require("request"); 
    request.get({
    headers: {'content-type' : 'application/json'},
    url:     'http://vps764501.ovh.net:3000/rcmnd',
    body:    values,
    json: true
    }, function(error, response, body){
        if(error)
            throw error;
        console.log(`body sugerencia: ${body.results[0]}`);
    });
}

// --------------- Events -----------------------
function dispatch(intentRequest, callback) {
    console.log(`request received for userId=${intentRequest.userId}, intentName=${intentRequest.currentIntent.name}`);
    const sessionAttributes = intentRequest.sessionAttributes;
    const slots = intentRequest.currentIntent.slots;
    const KPI = intentRequest.currentIntent.name;
    
    var values = {
        kpi : KPI, 
        country: slots.Country,
        month: slots.Month,  
        year: slots.Year 
    }
    sendKPI(values);
    
    console.log(intentRequest);
    try {
        postman_request(KPI, slots, function (results) {
            var reqResponse = results;
            console.log(reqResponse);
            receiveSug(values);
            if (reqResponse != null) {
                callback(close(sessionAttributes, 'Fulfilled',
                {'contentType': 'PlainText', 'content': `Result: ${reqResponse} `}));
            }
            else {
                callback(close(sessionAttributes, 'Failed',
                {'contentType': 'PlainText', 'content': `No ha encontrado nada`}));
            }

        });
    }
    catch(err){
        console.dir(err);
    }

}

// --------------- Main handler -----------------------

// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
exports.handler = (event, context, callback) => {
    try {
        dispatch(event,
            (response) => {
                callback(null, response);
            });
    } catch (err) {
        callback(err);
    }
};