require('dotenv').config()
const fs = require('fs')
const input = require('input')
const { Telegraf } = require("telegraf");

// Create a bot that uses 'polling' to fetch new updates
const bot = new Telegraf(process.env.botToken)

const apiID = parseInt(process.env.apiId)
const apiHash = process.env.api_hash
// Here only 10 unique referral links will be generated. i have also tested it with up to 1000 and it worked fine..
const number_of_links_to_create = 10

let invitation_link = []
let chat_ids = []
let chat_ids_to_usersnames_and_links = []
let userToLink = {}
let adminsID = []
let userToReferrals = {}
const dataFile = []


const { Api, TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const path = require('path');

const session = new StringSession(""); // You should put your string session here


(async () => {
  console.log("Loading interactive example...");
  const client = new TelegramClient(session, apiID, apiHash, {
    connectionRetries: 5,
  });
  await client.start({
    phoneNumber: async () => await input.text("number ?"),
    password: async () => await input.text("password?"),
    phoneCode: async () => await input.text("Code ?"),
    onError: (err) => console.log(err),
  });
  console.log("You should now be connected.");
  console.log(client.session.save()); // Save this string to avoid logging in again
  
  const c_o_n = await client.connect();// This assumes you have already authenticated with .start()
  for (let i = 0; i < number_of_links_to_create; i++){
    const result = await client.invoke(
      new Api.messages.ExportChatInvite({
        peer: parseInt(process.env.groupChatId),
        legacyRevokePermanent: false
      }))
      invitation_link.push(result.link.slice(14))
  }

  bot.start( async (ctx) => {
//First grab all the admins in the chat. (only admins will see the "get_stats" inline button).
    const chatid = ctx.chat.id
    const chatAdmins = await ctx.telegram.getChatAdministrators(parseInt(process.env.groupChatId));
    for(let i = 0; i < chatAdmins.length; i ++){adminsID.push(chatAdmins[i].user.id)};
   
//Run a check to see if the links generated are have not all been distributed, and also check to see if the user has
//previously interacted with the both. Then assign a referral link to the user.
    if (!invitation_link.length == 0 && !chat_ids.includes(chatid)){
    userToLink[chatid] = invitation_link[0]
    chat_ids.push(chatid)
    
//Get the current user's username or get the user's firstname if the user doesn't have a username. Then store the user
//information object to the correspoding array
    if(ctx.chat.username != undefined){
      let username = ctx.chat.username
      chat_ids_to_usersnames_and_links.push({'id': chatid, 'user': username, 'link': invitation_link[0]})
    } else {
      let username = ctx.chat.first_name
      chat_ids_to_usersnames_and_links.push({'id': chatid, 'user': username, 'link': invitation_link[0]})
    }
//Remove the assigned link from the invitation link array so it won't be assigned to someone else.
    invitation_link.shift()

//Display both the "referrals" and "get_stats" inline button if the current user is an admin in the group. Also send the 
//user his/her unique referral link
    if (adminsID.includes(ctx.chat.id)) {
      ctx.telegram.sendMessage(chatid, `t.me/+${userToLink[chatid]}`,{
        reply_markup: {
          inline_keyboard: [
            [{text: 'referrals', callback_data: 'referrals'}, {text: 'get_stats', callback_data: 'get_stats'}]
          ]
        }
      })
//User is not an admin, hence should only be shown the "referrals" inline button. Also send the user his/her unique 
//referral link
    } else {
      ctx.telegram.sendMessage(chatid, `t.me/+${userToLink[chatid]}`,{
        reply_markup: {
          inline_keyboard: [
            [{text: 'referrals', callback_data: 'referrals'}]
          ]
        }
      })
    }
  } else if(!invitation_link == 0 && chat_ids.includes(chatid)){
    ctx.telegram.sendMessage(chatid, 'you already have a referral link')
  } else {ctx.telegram.sendMessage(chatid, 'No more referral links')}
})

//The current user will be sent his/her referral count when they click on the referral button
  bot.action('referrals', async (ctx) => {
    try{
      if(!chat_ids.includes(ctx.chat.id)) {return} else if (chat_ids.includes(ctx.chat.id) && adminsID.includes(ctx.chat.id)){
            const c_oo_n = await client.connect();// This assumes you have already authenticated with .start()
            const result = await client.invoke(
              new Api.messages.GetChatInviteImporters({
                peer: parseInt(process.env.groupChatId),
                link: userToLink[ctx.chat.id],
                offsetDate: 2147483647,
                offsetUser: 'me',
                limit: 100000,
              })
            );
            userToReferrals[ctx.chat.id] = result.count
        
        ctx.reply(`you have invited ${userToReferrals[ctx.chat.id]} members`,{
          reply_markup: {
            inline_keyboard: [
              [{text: 'referrals', callback_data: 'referrals'}, {text: 'get_stats', callback_data: 'get_stats'}]
            ]
          }
        })
    } else {
          const c_ooo_n = await client.connect();// This assumes you have already authenticated with .start()
          const result = await client.invoke(
            new Api.messages.GetChatInviteImporters({
              peer: parseInt(process.env.groupChatId),
              link: userToLink[ctx.chat.id],
              offsetDate: 2147483647,
              offsetUser: 'me',
              limit: 100000,
            })
          );
          userToReferrals[ctx.chat.id] = result.count

      ctx.reply(`you have invited ${userToReferrals[ctx.chat.id]} members`,{
        reply_markup: {
          inline_keyboard: [
            [{text: 'referrals', callback_data: 'referrals'}]
          ]
        }
      })
  }
    } catch (err){return}
    })

  let data_ids = []
  let id_to_refcount = {}
//In summary this "get_stats" button when clicked will send the user/admin a json file containing information of all the
//users who have interacted with the bot (the information includes: usernames,ids,referral links, referral counts)
  bot.action('get_stats', async (ctx) => {

   if (!chat_ids.includes(ctx.chat.id)) {return} else {
     try{
    for (let index = 0; index < chat_ids_to_usersnames_and_links.length; index++){
        const c_oooo_n = await client.connect();// This assumes you have already authenticated with .start()
        const result = await client.invoke(
          new Api.messages.GetChatInviteImporters({
            peer: parseInt(process.env.groupChatId),
            link: userToLink[chat_ids_to_usersnames_and_links[index].id],
            offsetDate: 2147483647,
            offsetUser: 'me',
            limit: 100000,
          })
        );

        id_to_refcount[chat_ids_to_usersnames_and_links[index].id] = result.count;
        let data = {
          user: chat_ids_to_usersnames_and_links[index].user,
          links: `https://t.me/+${chat_ids_to_usersnames_and_links[index].link}`,
          idss: chat_ids_to_usersnames_and_links[index].id,
          invites: result.count,
        };

        if (!data_ids.includes(data.idss)) {
          dataFile.push(data);
          fs.writeFile(
            path.join(__dirname, "dataFile.json"),
            JSON.stringify(dataFile),
            (err) => console.log(err)
          );
          data_ids.push(data.idss);
        }
        
    }} catch (error) {return}

       
    setTimeout(() => {
      for(let i = 0; i < dataFile.length; i++) {
        const id = dataFile[i].idss

        dataFile[i].invites = id_to_refcount[id]
      }
      fs.writeFile(path.join(__dirname, 'dataFile.json'),JSON.stringify(dataFile), (err) => console.log(err))

    }, 2000);

    setTimeout(() => {
      ctx.telegram.sendDocument(
        ctx.chat.id,{
          source: './dataFile.json'
        }
      )
    }, 4000);
    
    ctx.reply('see json of current stats below',{
      reply_markup: {
        inline_keyboard: [
          [{text: 'referrals', callback_data: 'referrals'}, {text: 'get_stats', callback_data: 'get_stats'}]
        ]
      }
    })
   }
    
  })

bot.launch()

})();

