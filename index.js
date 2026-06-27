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

const ROL_MAP = {
    'futbolcu': '1512130383070892094',
    'baskan': '1512323399467139213',
    'td': '1513270136176381953'
};

let kayitSayilari = {};

client.once('ready', () => {
    console.log(`✅ Orijinal Kayıt ve Arama Sistemi Aktif: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // --- !k KOMUTU ---
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

    // --- .ara KOMUTU (EMBEDSIZ) ---
    if (message.content.startsWith('.ara')) {
        let aranan = message.content.replace('.ara', '').trim();
        if (!aranan) return message.reply('❌ **Hata:** Bir isim, mevki veya bayrak gir kanka. Örn: `.ara fransa`');

        const guild = client.guilds.cache.get(SUNUCU_ID) || message.guild;
        try {
            await guild.members.fetch(); 
        } catch (fErr) {
            console.error("Üyeler çekilemedi:", fErr);
        }
        
        const arananKucuk = aranan.toLowerCase().toLocaleLowerCase('tr-TR');
        const fransaKelimeleri = ['fransa', 'fransız', 'fransiz', 'fr', 'fra', '🇲🇫', '🇫🇷'];
        const fransaAraniyorMu = fransaKelimeleri.includes(arananKucuk);

        const sonuclar = guild.members.cache.filter(m => {
            const nick = m.nickname ? m.nickname.toLowerCase().toLocaleLowerCase('tr-TR') : '';
            const username = m.user.username.toLowerCase().toLocaleLowerCase('tr-TR');
            
            if (fransaAraniyorMu) {
                return nick.includes('🇲🇫') || nick.includes('🇫🇷') || nick.includes('fransa') || nick.includes('fransiz') ||
                       username.includes('fransa') || username.includes('fransiz');
            }
            return nick.includes(arananKucuk) || username.includes(arananKucuk) || (m.nickname && m.nickname.includes(aranan));
        });

        if (sonuclar.size === 0) return message.reply(`🔍 Aradığın kriterde (${aranan}) kimseyi bulamadım kanka.`);

        const liste = sonuclar.map(m => `👤 **${m.displayName}** - <@${m.user.id}>`).slice(0, 20).join('\n');
        
        return message.reply({
            content: `🔍 **Arama Sonuçları: "${aranan}"**\n\n${liste}\n\n📊 **${sonuclar.size} kişi bulundu.**`,
            allowedMentions: { users: [] }
        });
    }
});

// --- INTERACTION İŞLEYİCİ (Kayıt Butonları) ---
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    const [prefix, secenek, userId] = interaction.customId.split('_');
    if (prefix !== 'rol') return;

    try {
        const member = await interaction.guild.members.fetch(userId);
        if (!member) return interaction.reply({ content: '❌ Kullanıcı bulunamadı!', ephemeral: true });

        await member.roles.add(ROL_MAP[secenek]);
        const toplamKayit = kayitSayilari[interaction.user.id] || 0;
        
        return interaction.reply({ 
            content: `✅ **${member.displayName}** kullanıcısına rol verildi!\n📈 **Toplam Kayıt Sayın:** \`${toplamKayit}\`` 
        });
    } catch (e) {
        return interaction.reply({ content: '❌ Rol verilirken bir hata oluştu!', ephemeral: true });
    }
});

client.login(process.env.TOKEN);
            

