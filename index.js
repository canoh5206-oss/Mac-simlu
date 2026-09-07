const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios'); // Anlık veriler için
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = '!';
const SERVER_IP = process.env.MC_SERVER_IP || '33numara.exaroton.me';

// 1. Kapalı / Aktif Durum ve Oyuncu Sayısı (Bot Durumu)
client.once('ready', () => {
  console.log(`${client.user.tag} aktif!`);
  
  setInterval(async () => {
    try {
      const res = await axios.get(`https://api.mcsrvstat.us/2/${SERVER_IP}`);
      if (res.data.online) {
        client.user.setActivity(`🟢 ${res.data.players.online}/${res.data.players.max} Oyuncu`);
      } else {
        client.user.setActivity('🔴 Sunucu Kapalı');
      }
    } catch {
      client.user.setActivity('🔴 Sunucu Kapalı');
    }
  }, 30000); // 30 saniyede bir günceller
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // 2. !oyuncular veya !logs - Anlık Kimler Oyunda?
  if (command === 'oyuncular' || command === 'logs') {
    try {
      const res = await axios.get(`https://api.mcsrvstat.us/2/${SERVER_IP}`);
      
      if (!res.data.online) {
        return message.channel.send('🔴 Sunucu şu anda kapalı.');
      }

      const onlinePlayers = res.data.players.list || [];
      const playerCount = res.data.players.online;
      const playerMax = res.data.players.max;

      const embed = new EmbedBuilder()
        .setTitle('🎮 Aktif Oyuncu Listesi')
        .setColor('#55FF55')
        .addFields(
          { name: 'Kişilik / Kapasite', value: `\`${playerCount} / ${playerMax}\``, inline: true },
          { name: 'Durum', value: '🟢 Aktif', inline: true },
          { 
            name: 'Oyundaki Isimler', 
            value: onlinePlayers.length > 0 ? onlinePlayers.map(p => `• ${p}`).join('\n') : 'Şu anda oyunda kimse yok.' 
          }
        )
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    } catch (error) {
      return message.channel.send('Sunucu bilgileri alınırken bir hata oluştu.');
    }
  }

  // 3. !durum - Genel Sunucu Kişilik ve Bilgi Özeti
  if (command === 'durum') {
    try {
      const res = await axios.get(`https://api.mcsrvstat.us/2/${SERVER_IP}`);
      const isOnline = res.data.online;

      const embed = new EmbedBuilder()
        .setTitle('📊 Sunucu Bilgileri')
        .setColor(isOnline ? '#00FF00' : '#FF0000')
        .addFields(
          { name: 'IP Adresi', value: `\`${SERVER_IP}\``, inline: false },
          { name: 'Durum', value: isOnline ? '🟢 Aktif / Açık' : '🔴 Kapalı', inline: true },
          { name: 'Sunucu Kişilik', value: isOnline ? `\`${res.data.players.online}/${res.data.players.max}\`` : '`0/0`', inline: true }
        )
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    } catch {
      return message.channel.send('Durum bilgisi okunamadı.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
