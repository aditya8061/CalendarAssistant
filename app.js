// This loads the environment variables from the .env file
require('dotenv-extended').load();

var builder = require('botbuilder');
var restify = require('restify');
var Store = require('./store');
var spellService = require('./spell-service');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});
// Create connector and listen for messages
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector, function (session) {
    session.send('Sorry, I did not understand \'%s\'. Type \'help\' if you need assistance.', session.message.text);
});

// You can provide your own model by specifing the 'LUIS_MODEL_URL' environment variable
// This Url can be obtained by uploading or creating your model from the LUIS portal: https://www.luis.ai/
var recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
bot.recognizer(recognizer);


// Calendar.Add Intent
bot.dialog('Calendar.Add', 
    function (session, args) {
        session.send('Thanks for your message! We are analyzing your message: \'%s\'', session.message.text);
        // retrieve hotel name from matched entities
        var subject = builder.EntityRecognizer.findEntity(args.intent.entities, 'Calendar.Subject');
        var contact = builder.EntityRecognizer.findEntity(args.intent.entities, 'Calendar.Contact');
        var location = builder.EntityRecognizer.findEntity(args.intent.entities, 'Calendar.Location');
        var date = builder.EntityRecognizer.findEntity(args.intent.entities, 'Calendar.Date');
        var time = builder.EntityRecognizer.findEntity(args.intent.entities, 'Calendar.Time');
        if (subject && contact && location && date && time) {
            session.endDialog('Done. Please check your email for meeting invite.Thank You!');
        } else if (!subject) {
            session.endDialog('Please provide subject for your meeting invite');
        } else if(!contact){
            session.endDialog('Please provide contact for your meeting invite');
        }
        else if(!location){
            session.endDialog('Please provide location for your meeting invite');
        }
        else if(!date){
            session.endDialog('Please provide date for your meeting invite');
        }
        else if(!time){
            session.endDialog('Please provide time for your meeting invite');
        }
        else
        {
            builder.Prompts.text(session, 'Please provide meeting details');
        }
    }).triggerAction({
    matches: 'Calendar.Add',
    onInterrupted: function (session) {
        session.send('Please provide invite details');
    }
});

// Schedule Meeting Intent
bot.dialog('ScheduleMeeting', function (session) {
    session.endDialog('I\'m happy to Schedule the meeting. Could you provide meeting details. For example "Please schedule a meeting about Nascar Days with Todd Stuck at 2701 for today at 2pm"');
}).triggerAction({
    matches: 'ScheduleMeeting'
});

// Greeting Intent
bot.dialog('Greeting', function (session) {
    session.endDialog('Hi! Welcome to Cerner Calendar Assistant. How can I help you?');
}).triggerAction({
    matches: 'Greeting'
});

// Spell Check
if (process.env.IS_SPELL_CORRECTION_ENABLED === 'true') {
    bot.use({
        botbuilder: function (session, next) {
            spellService
                .getCorrectedText(session.message.text)
                .then(function (text) {
                    session.message.text = text;
                    next();
                })
                .catch(function (error) {
                    console.error(error);
                    next();
                });
        }
    });
}

// Helpers
function hotelAsAttachment(hotel) {
    return new builder.HeroCard()
        .title(hotel.name)
        .subtitle('%d stars. %d reviews. From $%d per night.', hotel.rating, hotel.numberOfReviews, hotel.priceStarting)
        .images([new builder.CardImage().url(hotel.image)])
        .buttons([
            new builder.CardAction()
                .title('More details')
                .type('openUrl')
                .value('https://www.bing.com/search?q=hotels+in+' + encodeURIComponent(hotel.location))
        ]);
}

function reviewAsAttachment(review) {
    return new builder.ThumbnailCard()
        .title(review.title)
        .text(review.text)
        .images([new builder.CardImage().url(review.image)]);
}