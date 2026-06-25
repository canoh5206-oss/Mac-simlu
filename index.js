const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers // Takma ad değiştirmek ve rol vermek için BU ŞART!
    ]
});

// Senin verdiğin Rol ID'leri buraya sabitlendi
const ROL_MAP = {
    'futbolcu': '1512130383070892094',
    'baskan': '1512323399467139213',
    'td': '1513270136176381953'
};

client.once('ready', () => {
    console.log(`🤖 Sadece Kayıt Sistemi Aktif kanka: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Örnek kullanım: !k @kullanici pele | SNT | 🇲🇫 | 1M€
    if (message.content.startsWith('!k')) {
        const hedefUye = message.mentions.members.first();
        if (!hedefUye) return message.reply('❌ **Hata:** Lütfen kayıt edilecek kullanıcıyı etiketle kanka! Örn: `!k @kullanici isim | mevki...`');

        // Etiket dışındaki metni alıp parçalıyoruz
        const metinKismi = message.content.substring(message.content.indexOf('>') + 1).trim();
        const parcalar = metinKismi.split('|').map(p => p.trim());
        
        if (parcalar.length < 4) {
            return message.reply('❌ **Hata:** Format hatalı! Örnek: `!k @user pele | SNT | 🇲🇫 | 1M€`');
        }

        const isim = parcalar[0];
        const mevki = parcalar[1].toUpperCase();
        const bayrak = parcalar[2];
        const deger = parcalar[3];

        // İstediğin yeni takma ad formatı: "pele | SNT | 🇲🇫 | 1M€"
        const yeniTakmaAd = `${isim} | ${mevki} | ${bayrak} | ${deger}`;

        try {
            // 1. ADIM: Takma adı otomatik değiştiriyoruz
            await hedefUye.setNickname(yeniTakmaAd);

            // 2. ADIM: Rol seçim butonlarını çıkartıyoruz
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`rol_futbolcu_${hedefUye.id}`).setLabel('⚽ Futbolcu').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`rol_baskan_${hedefUye.id}`).setLabel('👑 Başkan').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`rol_td_${hedefUye.id}`).setLabel('📋 TD').setStyle(ButtonStyle.Danger)
            );

            const embed = new EmbedBuilder()
                .setTitle('📝 Oyuncu Profili Oluşturuldu')
                .setDescription(`👤 **Kullanıcı:** ${hedefUye}\n🏷️ **Yeni Takma Adı:** \`${yeniTakmaAd}\`\n\n👇 **Aşağıdaki butonları kullanarak rol atamasını tamamla kanka:**`)
                .setColor(0x3498DB);

            return message.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error(error);
            return message.reply('❌ **Hata:** Kullanıcının adı değiştirilemedi! Botun rol sırasını kontrol et kanka.');
        }
    }
});

// BUTON TIKLAMA OLAYI
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    const [prefix, rolKey, userId] = interaction.customId.split('_');
    if (prefix !== 'rol') return;

    try {
        const member = await interaction.guild.members.fetch(userId);
        if (!member) return interaction.reply({ content: '❌ Kullanıcı sunucuda bulunamadı!', ephemeral: true });

        // İlgili rolü kullanıcıya tanımlıyoruz
        await member.roles.add(ROL_MAP[rolKey]);
        
        let rolIsmi = rolKey === 'futbolcu' ? 'Futbolcu' : rolKey === 'baskan' ? 'Başkan' : 'Teknik Direktör';
        return interaction.reply({ content: `✅ **${member.displayName}** kullanıcısına **${rolIsmi}** rolü başarıyla verildi!`, ephemeral: false });
        
    } catch (e) {
        console.error(e);
        return interaction.reply({ content: '❌ Rol verilirken bir hata oluştu! Botun rolü vermeye çalıştığın rollerin üstünde olmalı kanka.', ephemeral: true });
    }
});

client.login(process.env.TOKEN);

                
            
