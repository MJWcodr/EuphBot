
// dependencies
const { Telegraf, Markup } = require('telegraf')
const dotenv = require('dotenv');
const fs = require('fs')
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


// load environment variables
dotenv.config();

const token = process.env.BOT_TOKEN
if (token === undefined) {
    throw new Error('BOT_TOKEN must be provided!')
}

const bot = new Telegraf(token)

bot.help((ctx) => {
    ctx.reply(`
/euphoria → sends a random ai generated quote
/start_euphoria → sets the bot to send a quote and pin it at 8`)
})
//#region euphoria

toDays = (date) => Math.round(date / 86400000)
now = new Date()
euphDate = new Date(process.env.EUPHORIA_LAUNCH)
untilEuph = toDays(euphDate - now)
reg = "\${untilEuph}"

function dailyEuphoria() {

    const data = fs.readFileSync('data/sentences_daily', 'UTF-8', (err) => {
        if (err) {
            console.error(err)
        }
    })

    // split the contents by new line

    const lines = data.split(/\r?\n/);
    out = (i) => lines[i].replace(reg, untilEuph)
    return out(untilEuph)
}
function randomEuphoria() {
    data = fs.readFileSync('data/sentence_db', 'utf-8')
    lines = data.split(/\r?\n/);
    quote = lines[Math.floor(Math.random() * lines.length)]
    return quote.replace(reg, untilEuph)
}
async function queryGPT3() {
    authorization = process.env.OPENAI_TOKEN;
    url = "https://api.openai.com/v1/engines/davinci-codex/completions";

    const prompt = fs.readFileSync("data/training_sentences", 'utf-8') ; //TODO: ADD PROMPT

    const body = {
        "prompt": prompt,
        "temperature": 0.7,
        "max_tokens": 60,
        "top_p": 1,
        "frequency_penalty": 0.38,
        "presence_penalty": 0.37,
        "stop": ["\n"]
    };

    await fetch(url, {
        method: "post",
        headers: {
            'Authorization': `Bearer ${authorization}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    })
        .then(response => response.json())
        .then(data => {
            out = data
        })
}

/* bot.command('euphoria', (ctx) => {
    ctx.replyWithMarkdown(randomEuphoria())
}) */

bot.command('euphoria', (ctx) => {
    queryGPT3()
    .then(() => {
        printContent = out.choices[0].text.replace(/[(\$*)]/g, untilEuph)
        ctx.reply(printContent)
    })

})

bot.command('test', (ctx) => {
    ctx.reply("test")
    console.log(ctx.message.message_id)
    ctx.pinChatMessage(ctx.message.message_id)
})

bot.command('start_euphoria', (ctx) => {
    ctx.reply("started daily messages")
    ctx.reply(dailyEuphoria())
        .then((m) => ctx.pinChatMessage(m.message_id))
    setInterval(() => {
        d = new Date()
        if (d.getHours() == "06" && d.getMinutes() == "00") {
            ctx.replyWithMarkdown(dailyEuphoria())
            ctx.pinChatMessage(ctx.message.message_id)
        }
    }, 1000 * 35)
})

//#endregion

bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))