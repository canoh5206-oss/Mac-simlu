const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers
    ]
});

const SUNUCU_ID = '1511859511634301059'; 
const YETKILI_ROL_ID = '1512316879551860796';
const BILGI_KANAL_ID = '1515123600502427739'; // Tekliflerin durumunun atılacağı kanal

const ROL_MAP = {
    'futbolcu': '1512130383070892094',
    'baskan': '1512323399467139213',
    'td': '1513270136176381953'
};

let kayitSayilari = {};

client.once('ready', () => {
    console.log(`✅ Akıllı Fransa, Emoji Destekli Arama ve Transfer DM Aktif: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // --- !k KOMUTU (Orijinal Yapın) ---
    if (message.content.startsWith('!k')) {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) {
            return message.reply('❌ **Hata:** Kayıt yapma yetkin yok kanka!');
        }

        const hedonUye = message.mentions.members.first();
        if (!hedonUye) return message.reply('❌ Kullanıcıyı etiketle kanka!');

        const metinKismi = message.content.substring(message.content.indexOf('>') + 1).trim();
        const parcalar = metinKismi.split('|').map(p => p.trim());
        if (parcalar.length < 4) return message.reply('❌ Format: `!k @user isim | mevki | bayrak | değer`');

        const yeniTakmaAd = `${parcalar[0]} | ${parcalar[1].toUpperCase()} | ${parcalar[2]} | ${parcalar[3]}`;

        try {
            await hedonUye.setNickname(yeniTakmaAd);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`rol_futbolcu_${hedonUye.id}`).setLabel('⚽ Futbolcu').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`rol_baskan_${hedonUye.id}`).setLabel('👑 Başkan').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`rol_td_${hedonUye.id}`).setLabel('📋 TD').setStyle(ButtonStyle.Danger)
            );

            const embed = new EmbedBuilder()
                .setTitle('📝 Kayıt Başarılı')
                .setDescription(`👤 **Üye:** ${hedonUye}\n🏷️ **Takma Ad:** \`${yeniTakmaAd}\`\n\n👇 **Rol seçimi:**`)
                .setColor(0x00FF00);

            await message.reply({ embeds: [embed], components: [row] });
            kayitSayilari[message.author.id] = (kayitSayilari[message.author.id] || 0) + 1;
        } catch (e) {
            message.reply('❌ Bot yetkilerini kontrol et kanka!');
        }
    }

    // --- .dm TRANSFER TEKLİF KOMUTU ---
    if (message.content.startsWith('.dm')) {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) {
            return message.reply('❌ **Hata:** Bu komutu kullanmaya yetkin yok kanka!');
        }

        const hedefUye = message.mentions.members.first();
        if (!hedefUye) return message.reply('❌ **Hata:** Teklif gönderilecek
;


