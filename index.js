const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionFlagsBits 
} = require('discord.js');
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

// Sistem Durum Değişkenleri
let isLogsActive = true; 
let previousPlayers = [];
let wasServerOnline = null;

client.once('ready', () => {
  console.log(`${client.user.tag} aktif! Log ve Şikayet altyapısı hazır.`);

  // Otomatik Log İzleme Döngüsü (30 Saniyede Bir)
  setInterval(async () => {
    if (!isLogsActive) return; // .logskapat yapıldıysa log atmaz

    try {
      const res = await axios.get(`https://api.mcsrvstat.us/2/${SERVER_IP}`);
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);

      if (!logChannel) return;

      const currentTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-2-digit', minute: '2-2-digit' });
      const isOnline = res.data.online;

      // 1. Sunucu Açıldı / Kapandı Logu
      if (wasServerOnline !== null && wasServerOnline !== isOnline) {
        if (isOnline) {
          const embed = new EmbedBuilder()
            .setTitle('🟢 Sunucu Açıldı')
            .setColor('#55FF55')
            .setDescription(`\`${SERVER_IP}\` sunucusu aktifleşti! Oyuncular katılabilir.`)
            .setTimestamp();
          logChannel.send({ embeds: [embed] });
        } else {
          const embed = new EmbedBuilder()
            .setTitle('🔴 Sunucu Kapandı')
            .setColor('#FF5555')
            .setDescription(`\`${SERVER_IP}\` sunucusu kapandı veya bakıma alındı.`)
            .setTimestamp();
          logChannel.send({ embeds: [embed] });
        }
      }
      wasServerOnline = isOnline;

      if (isOnline) {
        const currentPlayers = res.data.players.list || [];

        // 2. Oyuncu Giriş Logu
        const joined = currentPlayers.filter(p => !previousPlayers.includes(p));
        joined.forEach(player => {
          const embed = new EmbedBuilder()
            .setTitle('📥 Oyuncu Katıldı')
            .setColor('#55FF55')
            .addFields(
              { name: 'Oyuncu İsim', value: `\`${player}\``, inline: true },
              { name: 'Saat', value: `\`${currentTime}\``, inline: true }
            )
            .setTimestamp();
          logChannel.send({ embeds: [embed] });
        });

        // 3. Oyuncu Çıkış Logu
        const left = previousPlayers.filter(p => !currentPlayers.includes(p));
        left.forEach(player => {
          const embed = new EmbedBuilder()
            .setTitle('📤 Oyuncu Ayrıldı')
            .setColor('#FF5555')
            .addFields(
              { name: 'Oyuncu İsim', value: `\`${player}\``, inline: true },
              { name: 'Saat', value: `\`${currentTime}\``, inline: true }
            )
            .setTimestamp();
          logChannel.send({ embeds: [embed] });
        });

        previousPlayers = currentPlayers;
        client.user.setActivity(`🟢 ${res.data.players.online}/${res.data.players.max} Oyuncu`);
      } else {
        previousPlayers = [];
        client.user.setActivity('🔴 Sunucu Kapalı');
      }
    } catch (err) {
      console.error('Log izleme hatası:', err.message);
    }
  }, 30000);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Yalnızca "Sunucuyu Yönet" (Manage Guild) yetkisi olanların kullanabileceği komut denetimi
  const hasManageServer = message.member && message.member.permissions.has(PermissionFlagsBits.ManageGuild);

  // 1. .logsac - Otomatik logları açar
  if (command === 'logsac') {
    if (!hasManageServer) return message.reply('❌ Bu komutu kullanmak için **Sunucuyu Yönet** yetkisine sahip olmalısınız.');
    isLogsActive = true;
    return message.reply('✅ Otomatik log gönderimi **AÇILDI**.');
  }

  // 2. .logskapat - Otomatik logları kapatır
  if (command === 'logskapat') {
    if (!hasManageServer) return message.reply('❌ Bu komutu kullanmak için **Sunucuyu Yönet** yetkisine sahip olmalısınız.');
    isLogsActive = false;
    return message.reply('🛑 Otomatik log gönderimi **KAPATILDI**.');
  }

  // 3. .sikayetvar / .sikayet - Yetkili Onaylı (Evet/Hayır) Şikayet Sistemi
  if (command === 'sikayet' || command === 'sikayetvar') {
    const sikayetMetni = args.join(' ');
    if (!sikayetMetni) {
      return message.reply('Lütfen şikayet detayını yazın! (Örn: `.sikayetvar OyuncuAdi hile/kill aura kullanıyor`)');
    }

    const sikayetKanal = await client.channels.fetch(SIKAYET_CHANNEL_ID).catch(() => null);
    if (!sikayetKanal) return message.reply('Şikayet kanalı bulunamadı.');

    const embed = new EmbedBuilder()
      .setTitle('⚠️ Yeni Şikayet / Hile Bildirimi')
      .setColor('#FFAA00')
      .addFields(
        { name: 'Bildiren Üye', value: `${message.author}`, inline: true },
        { name: 'Saat', value: `\`${new Date().toLocaleTimeString('tr-TR', { hour: '2-2-digit', minute: '2-2-digit' })}\``, inline: true },
        { name: 'Şikayet / Hile Detayı', value: sikayetMetni, inline: false },
        { name: 'Durum', value: '⏳ Yetkili Onayı Bekleniyor', inline: false }
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('sikayet_evet')
        .setLabel('Evet (İşleme Al)')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('sikayet_hayir')
        .setLabel('Hayır (Reddet)')
        .setStyle(ButtonStyle.Danger)
    );

    await sikayetKanal.send({ embeds: [embed], components: [row] });
    return message.reply('Şikayetiniz yetkili onayına gönderildi.');
  }

  // 4. .ip
  if (command === 'ip') {
    const embed = new EmbedBuilder()
      .setTitle('🎮 Minecraft Sunucu IP')
      .setColor('#55FF55')
      .addFields({ name: 'Sunucu IP', value: `\`${SERVER_IP}\``, inline: false })
      .setFooter({ text: 'İyi oyunlar!' });
    return message.channel.send({ embeds: [embed] });
  }

  // 5. .oyuncular / .logs
  if (command === 'oyuncular' || command === 'logs') {
    try {
      const res = await axios.get(`https://api.mcsrvstat.us/2/${SERVER_IP}`);
      if (!res.data.online) return message.channel.send('🔴 Sunucu kapalı.');

      const players = res.data.players.list || [];
      const embed = new EmbedBuilder()
        .setTitle('👥 Aktif Oyuncu Listesi')
        .setColor('#00AAAA')
        .addFields(
          { name: 'Kişilik', value: `\`${res.data.players.online}/${res.data.players.max}\``, inline: true },
          { name: 'Oyundaki İsimler', value: players.length > 0 ? players.map(p => `• ${p}`).join('\n') : 'Kimse yok.' }
        )
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    } catch {
      return message.channel.send('Oyuncu bilgisi alınamadı.');
    }
  }
});

// Buton Etkileşim Yönetimi (Evet / Hayır Seçenekleri)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  // Yalnızca "Sunucuyu Yönet" yetkisi olan yetkililer Evet/Hayır kararı verebilir
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: '❌ Bu işlemi yalnızca **Sunucuyu Yönet** yetkisine sahip yetkililer onaylayabilir.', ephemeral: true });
  }

  const oldEmbed = interaction.message.embeds[0];
  if (!oldEmbed) return;

  const editedEmbed = EmbedBuilder.from(oldEmbed);

  if (interaction.customId === 'sikayet_evet') {
    editedEmbed
      .setColor('#00FF00')
      .spliceFields(3, 1, { name: 'Durum', value: `✅ **Onaylandı (İşleme Alındı)** - Yetkili: ${interaction.user}`, inline: false });

    // Şikayet onaylandığında Otomatik Log kanalına da aktarma yapılır
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle('🚨 Şikayet Loglara İşlendi')
        .setColor('#FF5555')
        .addFields(
          { name: 'Detay', value: oldEmbed.fields[2].value },
          { name: 'Onaylayan Yetkili', value: `${interaction.user}` }
        )
        .setTimestamp();
      logChannel.send({ embeds: [logEmbed] });
    }

    await interaction.update({ embeds: [editedEmbed], components: [] });
  }

  if (interaction.customId === 'sikayet_hayir') {
    editedEmbed
      .setColor('#FF0000')
      .spliceFields(3, 1, { name: 'Durum', value: `❌ **Reddedildi** - Yetkili: ${interaction.user}`, inline: false });

    await interaction.update({ embeds: [editedEmbed], components: [] });
  }
});

client.login(process.env.DISCORD_TOKEN);
  
