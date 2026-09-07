const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = '.';
const SERVER_IP = process.env.MC_SERVER_IP || '33numara.exaroton.me';

// Kanal ID Tanımlamaları
const LOG_CHANNEL_ID = '1546447890606596096';
const SIKAYET_CHANNEL_ID = '1546450907770658876';

let previousPlayers = [];

client.once('ready', () => {
  console.log(`${client.user.tag} aktif! Log ve komut sistemi hazır.`);

  // Giriş/Çıkış ve Oyuncu İzleme Döngüsü (30 Saniyede Bir)
  setInterval(async () => {
    try {
      const res = await axios.get(`https://api.mcsrvstat.us/2/${SERVER_IP}`);
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);

      if (res.data.online && logChannel) {
        const currentPlayers = res.data.players.list || [];
        const currentTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-2-digit', minute: '2-2-digit' });

        // Giriş Yapanlar
        const joined = currentPlayers.filter(p => !previousPlayers.includes(p));
        joined.forEach(player => {
          const embed = new EmbedBuilder()
            .setTitle('📥 Oyuncu Giriş Yaptı')
            .setColor('#55FF55')
            .addFields(
              { name: 'Oyuncu', value: `\`${player}\``, inline: true },
              { name: 'Saat', value: `\`${currentTime}\``, inline: true }
            )
            .setTimestamp();
          logChannel.send({ embeds: [embed] });
        });

        // Çıkış Yapanlar
        const left = previousPlayers.filter(p => !currentPlayers.includes(p));
        left.forEach(player => {
          const embed = new EmbedBuilder()
            .setTitle('📤 Oyuncu Ayrıldı')
            .setColor('#FF5555')
            .addFields(
              { name: 'Oyuncu', value: `\`${player}\``, inline: true },
              { name: 'Saat', value: `\`${currentTime}\``, inline: true }
            )
            .setTimestamp();
          logChannel.send({ embeds: [embed] });
        });

        previousPlayers = currentPlayers;
        client.user.setActivity(`🟢 ${res.data.players.online}/${res.data.players.max} Oyuncu`);
      } else {
        client.user.setActivity('🔴 Sunucu Kapalı');
      }
    } catch (err) {
      console.error('Log tarama hatası:', err.message);
    }
  }, 30000);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // 1. .ip - Sunucu IP Adresi
  if (command === 'ip') {
    const embed = new EmbedBuilder()
      .setTitle('🎮 Minecraft Sunucu IP')
      .setColor('#55FF55')
      .addFields(
        { name: 'Sunucu IP', value: `\`${SERVER_IP}\``, inline: false },
        { name: 'Sürüm', value: '`1.21.1`', inline: true }
      )
      .setFooter({ text: 'İyi oyunlar!' });

    return message.channel.send({ embeds: [embed] });
  }

  // 2. .aktiflik / .durum - Sunucu Açık/Kapalı ve Doluluk Durumu
  if (command === 'aktiflik' || command === 'durum') {
    try {
      const res = await axios.get(`https://api.mcsrvstat.us/2/${SERVER_IP}`);
      const isOnline = res.data.online;

      const embed = new EmbedBuilder()
        .setTitle('📊 Sunucu Aktiflik Durumu')
        .setColor(isOnline ? '#55FF55' : '#FF5555')
        .addFields(
          { name: 'Sunucu IP', value: `\`${SERVER_IP}\``, inline: false },
          { name: 'Durum', value: isOnline ? '🟢 Aktif / Çevrimiçi' : '🔴 Kapalı / Çevrimdışı', inline: true },
          { name: 'Kişilik (Doluluk)', value: isOnline ? `\`${res.data.players.online}/${res.data.players.max}\`` : '`0/0`', inline: true }
        )
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    } catch {
      return message.channel.send('Aktiflik durumu sorgulanırken hata oluştu.');
    }
  }

  // 3. .oyuncular / .logs - Oyundaki İsimler ve Sayı
  if (command === 'oyuncular' || command === 'logs') {
    try {
      const res = await axios.get(`https://api.mcsrvstat.us/2/${SERVER_IP}`);
      const currentTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-2-digit', minute: '2-2-digit' });

      if (!res.data.online) {
        return message.channel.send('🔴 Sunucu şu anda kapalı.');
      }

      const players = res.data.players.list || [];
      const embed = new EmbedBuilder()
        .setTitle('👥 Aktif Oyuncu Listesi')
        .setColor('#00AAAA')
        .addFields(
          { name: 'Sorgu Saati', value: `\`${currentTime}\``, inline: true },
          { name: 'Kişilik', value: `\`${res.data.players.online}/${res.data.players.max}\``, inline: true },
          { 
            name: 'Oyundaki İsimler', 
            value: players.length > 0 ? players.map(p => `• ${p}`).join('\n') : 'Şu anda oyunda kimse yok.' 
          }
        )
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    } catch {
      return message.channel.send('Oyuncu bilgileri alınamadı.');
    }
  }

  // 4. .sikayetvar / .sikayet - Şikayet Bildirimi
  if (command === 'sikayet' || command === 'sikayetvar') {
    const sikayetMetni = args.join(' ');
    if (!sikayetMetni) {
      return message.reply('Lütfen şikayetinizi belirtin! (Örn: `.sikayetvar OyuncuName hile kullanıyor`)');
    }

    const sikayetKanal = await client.channels.fetch(SIKAYET_CHANNEL_ID).catch(() => null);
    if (!sikayetKanal) {
      return message.reply('Şikayet kanalı bulunamadı.');
    }

    const embed = new EmbedBuilder()
      .setTitle('⚠️ Yeni Hile / Oyuncu Şikayeti')
      .setColor('#FFAA00')
      .addFields(
        { name: 'Bildiren', value: `${message.author}`, inline: true },
        { name: 'Saat', value: `\`${new Date().toLocaleTimeString('tr-TR', { hour: '2-2-digit', minute: '2-2-digit' })}\``, inline: true },
        { name: 'Şikayet Detayı', value: sikayetMetni, inline: false }
      )
      .setTimestamp();

    await sikayetKanal.send({ embeds: [embed] });
    return message.reply('Şikayetiniz yetkililere iletildi.');
  }

  // 5. .yardim - Güncel Komut Listesi
  if (command === 'yardim' || command === 'help') {
    const embed = new EmbedBuilder()
      .setTitle('📜 Bot Komut Menüsü')
      .setColor('#3498DB')
      .setDescription('Kullanabileceğiniz tüm komutlar aşağıda listelenmiştir:')
      .addFields(
        { name: '`.ip`', value: 'Sunucunun IP adresini gösterir.', inline: false },
        { name: '`.aktiflik`', value: 'Sunucunun açık/kapalı durumunu ve toplam kapasitesini gösterir.', inline: false },
        { name: '`.oyuncular` (veya `.logs`)', value: 'Oyunda aktif olan kişilerin isimlerini ve saatini gösterir.', inline: false },
        { name: '`.sikayetvar [mesaj]`', value: 'Hile veya oyuncu şikayetlerinizi yetkililere iletir.', inline: false },
        { name: '`.yardim`', value: 'Bu yardım menüsünü görüntüler.', inline: false }
      )
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);
