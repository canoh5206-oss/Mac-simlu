const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers
    ]
});

// Ayarlar
const YETKILI_ROL_ID = '1512316879551860796'; // Kayıt yapabileceklerin rol ID'si
const ROL_MAP = {
    'futbolcu': '1512130383070892094',
    'baskan': '1512323399467139213',
    'td': '1513270136176381953'
};

// Kayıt sayılarını tutan yer: { "kullaniciID": 5 }
let kayitSayilari = {};

client.once('ready', () => {
    console.log(`✅ Kayıtçı Sistemi Hazır: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('!k')) {
        // 1. Yetki Kontrolü
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

            // Başarı Embed'i
            const embed = new EmbedBuilder()
                .setTitle('📝 Kayıt Başarılı')
                .setDescription(`👤 **Üye:** ${hedefUye}\n🏷️ **Takma Ad:** \`${yeniTakmaAd}\`\n\n👇 **Rol seçimi için butona tıkla:**`)
                .setColor(0x00FF00);

            await message.reply({ embeds: [embed], components: [row] });
            
            // Kayıt eden kişiyi hafızaya alıp sayıyı artırıyoruz
            const kayitciId = message.author.id;
            kayitSayilari[kayitciId] = (kayitSayilari[kayitciId] || 0) + 1;
            
        } catch (e) {
            message.reply('❌ Bot yetkilerini kontrol et kanka!');
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const [_, rolKey, userId] = interaction.customId.split('_');
    const member = await interaction.guild.members.fetch(userId);
    
    await member.roles.add(ROL_MAP[rolKey]);
    
    // Kayıt sayısını burada gösteriyoruz
    const kayitci = interaction.user.id;
    const toplamKayit = kayitSayilari[kayitci] || 0;

    interaction.reply({ 
        content: `✅ **${member.displayName}** kullanıcısına rol verildi!\n🏅 **Kayıt Eden:** ${interaction.user.tag}\n📈 **Toplam Kayıt Sayın:** \`${toplamKayit}\`` 
    });
});

client.login(process.env.TOKEN);
