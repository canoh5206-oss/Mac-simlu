const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', () => {
    console.log(`🚀 Lig botu Railway üzerinde aktif: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('.')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ==========================================
    // 1. .yardim KOMUTU
    // ==========================================
    if (command === 'yardim' || command === 'yardım') {
        const yardimEmbed = new EmbedBuilder()
            .setTitle('📋 Reality & Crusy League - Komut Kılavuzu')
            .setColor(0x2ECC71)
            .setDescription('Ligimizdeki oyuncuları aramak ve filtrelemek için aşağıdaki komutları kullanabilirsin kanka:')
            .addFields(
                { name: '🔍 Mevki & Ülke Arama', value: '`.ara <mevki/bayrak>`\n*Örnek:* `.ara SNT`, `.ara sağ bek`, `.ara 🇧🇷`', inline: false },
                { name: '👤 İsim ile Oyuncu Arama', value: '`.ara <oyuncu_adı>`\n*Örnek:* `.ara V.júnior`, `.ara Çağatay`', inline: false },
                { name: 'ℹ️ Kısaltma İpuçları', value: '`sağ bek` = SB, `sol bek` = SLB, `santrafor` = SNT', inline: true }
            )
            .setFooter({ text: 'Sistem 7/24 Aktif • Keyifli RP\'ler!' });

        return message.reply({ embeds: [yardimEmbed] });
    }

    // ==========================================
    // 2. .ara KOMUTU (Gelişmiş Filtreleme & İsim Arama)
    // ==========================================
    if (command === 'ara') {
        let kriter = args.join(' ');

        if (!kriter) {
            return message.reply('❌ **Hata:** Ne aratmak istiyorsun kanka? Yazman lazım.\n*Örnek:* `.ara sağ bek` veya `.ara V.júnior` veya `.ara 🇲🇫`');
        }

        // Türkçe yazılan uzun mevkileri sistemin tanıması için kısaltmalara veya standart terimlere eşliyoruz
        const kriterLower = kriter.toLowerCase();
        if (kriterLower === 'sağ bek' || kriterLower === 'sag bek') kriter = 'SB';
        if (kriterLower === 'sol bek') kriter = 'SLB';
        if (kriterLower === 'stoper') kriter = 'STP';
        if (kriterLower === 'santrafor') kriter = 'SNT';
        if (kriterLower === 'kaleci') kriter = 'KL';

        try {
            // Sunucudaki tüm üyeleri güncel olarak Discord'dan çekiyoruz
            await message.guild.members.fetch();

            // Üyenin hem takma adını (displayName) hem de orijinal kullanıcı adını (username) aratılan kriterle eşleştiriyoruz
            const sonuclar = message.guild.members.cache.filter(member => {
                const takmaAd = member.displayName ? member.displayName.toLowerCase() : '';
                const kullanıcıAdı = member.user.username ? member.user.username.toLowerCase() : '';
                const aranan = kriter.toLowerCase();

                return takmaAd.includes(aranan) || kullanıcıAdı.includes(aranan);
            });

            if (sonuclar.size === 0) {
                return message.reply(`❌ Kriterlere veya isme uygun (\`${args.join(' ')}\`) oyuncu sunucuda bulunamadı kanka!`);
            }

            // İlk 20 sonucu listele (Discord yazı sınırına takılmamak için)
            const liste = sonuclar
                .map(m => `👤 ${m.toString()} - \`${m.displayName}\``)
                .slice(0, 20)
                .join('\n');

            const embed = new EmbedBuilder()
                .setTitle('🔍 Oyuncu / Mevki Arama Sonuçları')
                .setDescription(`🔎 **Aranan Kelime/Kriter:** \`${args.join(' ')}\` ${kriter !== args.join(' ') ? `(\`${kriter}\` olarak arandı)` : ''}\n\n${liste}`)
                .setColor(0x3498db)
                .setFooter({ text: 'Crusy & Reality League Arama Motoru' });

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await message.reply('❌ Oyuncular taranırken teknik bir hata oluştu kanka, Railway loglarını kontrol et!');
        }
    }
});

client.login(process.env.TOKEN);
