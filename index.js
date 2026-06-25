
        
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers
    ]
});

const YETKILI_ROL_ID = '1512316879551860796';
const ROL_MAP = {
    'futbolcu': '1512130383070892094',
    'baskan': '1512323399467139213',
    'td': '1513270136176381953'
};

let kayitSayilari = {};

client.once('ready', () => {
    console.log(`✅ Kayıt ve Gelişmiş Arama Sistemi Aktif: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // --- !k KOMUTU ---
    if (message.content.startsWith('!k')) {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) {
            return message.reply('❌ **Hata:** Kayıt yapma yetkin yok kanka!');
        }

        const hedefUye = message.mentions.members.first();
        if (!hedefUye) return message.reply('❌ Kullanıcıyı etiketle kanka!');

        const metinKismi = message.content.substring(message.content.indexOf('>') + 1).trim();
        const parcalar = metinKismi.split('|').map(p => p.trim());
        if (parcalar.length < 4) return message.reply('❌ Format: `!k @user isim | mevki | bayrak | değer`');

        const yeniTakmaAd = `${parcalar[0]} | ${parcalar[1].toUpperCase()} | ${parcalar[2]} | ${parcalar[3]}`;

        try {
            await hedefUye.setNickname(yeniTakmaAd);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`rol_futbolcu_${hedefUye.id}`).setLabel('⚽ Futbolcu').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`rol_baskan_${hedefUye.id}`).setLabel('👑 Başkan').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`rol_td_${hedefUye.id}`).setLabel('📋 TD').setStyle(ButtonStyle.Danger)
            );

            const embed = new EmbedBuilder()
                .setTitle('📝 Kayıt Başarılı')
                .setDescription(`👤 **Üye:** ${hedefUye}\n🏷️ **Takma Ad:** \`${yeniTakmaAd}\`\n\n👇 **Rol seçimi:**`)
                .setColor(0x00FF00);

            await message.reply({ embeds: [embed], components: [row] });
            kayitSayilari[message.author.id] = (kayitSayilari[message.author.id] || 0) + 1;
        } catch (e) {
            message.reply('❌ Bot yetkilerini kontrol et kanka!');
        }
    }

    // --- .ara KOMUTU ---
    if (message.content.startsWith('.ara')) {
        const aranan = message.content.replace('.ara', '').trim();
        if (!aranan) return message.reply('❌ **Hata:** Bir isim, mevki veya bayrak gir kanka. Örn: `.ara 🇫🇷`');

        await message.guild.members.fetch(); // Sunucudaki tüm üyeleri güncelle/çek
        
        // Büyük-küçük harf duyarlılığını tamamen ortadan kaldırıyoruz (Türkçe karakter uyumlu)
        const arananKucuk = aranan.toLowerCase().toLocaleLowerCase('tr-TR');

        const sonuclar = message.guild.members.cache.filter(m => {
            const nick = m.nickname ? m.nickname.toLowerCase().toLocaleLowerCase('tr-TR') : '';
            const username = m.user.username.toLowerCase().toLocaleLowerCase('tr-TR');
            
            // Eğer aranan şey direkt Fransa bayrağıysa veya metnin içinde geçiyorsa yakala
            return nick.includes(arananKucuk) || username.includes(arananKucuk) || (m.nickname && m.nickname.includes(aranan));
        });

        if (sonuclar.size === 0) return message.reply(`🔍 Aradığın kriterde (${aranan}) kimseyi bulamadım kanka.`);

        const liste = sonuclar.map(m => `👤 **${m.displayName}** - ${m.user.toString()}`).slice(0, 15).join('\n');
        
        const embed = new EmbedBuilder()
            .setTitle(`🔍 Arama Sonuçları: "${aranan}"`)
            .setDescription(liste)
            .setColor(0xF1C40F)
            .setFooter({ text: `${sonuclar.size} kişi bulundu.` });

        message.reply({ embeds: [embed] });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const [_, rolKey, userId] = interaction.customId.split('_');
    const member = await interaction.guild.members.fetch(userId);
    await member.roles.add(ROL_MAP[rolKey]);
    
    const toplamKayit = kayitSayilari[interaction.user.id] || 0;
    interaction.reply({ 
        content: `✅ **${member.displayName}** kullanıcısına rol verildi!\n📈 **Toplam Kayıt Sayın:** \`${toplamKayit}\`` 
    });
});

client.login(process.env.TOKEN);
