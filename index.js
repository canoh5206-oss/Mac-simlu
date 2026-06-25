const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

// Botun ihtiyaç duyduğu tüm yetkileri (Intent'leri) açıyoruz
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Bot aktif olduğunda konsola yazdıracak kısım
client.once('ready', () => {
    console.log(`🚀 Bot başarıyla aktif oldu: ${client.user.tag}`);
});

// Komut Dinleyici
client.on('messageCreate', async (message) => {
    // Botların kendi mesajlarına cevap vermesini engeller ve sadece "." ile başlayanları dinler
    if (message.author.bot || !message.content.startsWith('.')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // .ara Komutu
    if (command === 'ara') {
        const kriter = args.join(' ');

        if (!kriter) {
            return message.reply('❌ **Hata:** Lütfen aratmak istediğin mevkiyi veya ülkeyi yaz kanka! *(Örn: `.ara SNT` veya `.ara 🇲🇫`)*');
        }

        // Sunucudaki tüm üyeleri güncel olarak çekiyoruz (Cache sorununu çözer)
        await message.guild.members.fetch();

        // Kriteri içeren üyeleri filtreleme
        const sonuclar = message.guild.members.cache.filter(member => {
            const isim = member.displayName || '';
            return isim.toLowerCase().includes(kriter.toLowerCase());
        });

        if (sonuclar.size === 0) {
            return message.reply(`❌ Kriterlere uygun (` + kriter + `) oyuncu bulunamadı!`);
        }

        // İlk 20 sonucu listele (Çok fazla üye varsa Discord sınırı aşmasın diye)
        const liste = sonuclar.map(m => `👤 ${m.toString()} - \`${m.displayName}\``).slice(0, 20).join('\n');

        const embed = new EmbedBuilder()
            .setTitle('🔍 Oyuncu Arama Sonuçları')
            .setDescription(`🔎 **Aranan Kriter:** \`${kriter}\`\n\n${liste}`)
            .setColor(0x3498db)
            .setFooter({ text: 'Crusy & Reality League Filtre Sistemi' });

        await message.reply({ embeds: [embed] });
    }
});

// Botun Discord Tokeni (Railway'de Environment Variables kısmına TOKEN adıyla ekleyeceğiz)
client.login(process.env.TOKEN);
