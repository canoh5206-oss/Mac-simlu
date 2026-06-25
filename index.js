const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

// Botun sunucudaki üyeleri ve mesajları eksiksiz okuyabilmesi için gerekli tüm Intent'leri açıyoruz
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Bot aktif olduğunda Railway konsoluna yazdırılacak kısım
client.once('ready', () => {
    console.log(`🚀 Lig botu Railway üzerinde sorunsuz aktif edildi: ${client.user.tag}`);
});

// Komut Dinleyici Sistemi
client.on('messageCreate', async (message) => {
    // Botların kendi mesajlarına yanıt vermesini engeller ve sadece "." ile başlayanları dinler
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
                { name: 'ℹ️ Eklenen Mevki Kısaltmaları', value: '`SNT`, `SĞK`, `SLK`, `OSS`, `SGB`, `SLB`, `STP`, `KL`', inline: true }
            )
            .setFooter({ text: 'Sistem 7/24 Aktif • Keyifli RP\'ler!' });

        return message.reply({ embeds: [yardimEmbed] });
    }

    // ==========================================
    // 2. .ara KOMUTU (Gelişmiş & Önbellek Sorunu Olmayan)
    // ==========================================
    if (command === 'ara') {
        let arananKelime = args.join(' ');

        if (!arananKelime) {
            return message.reply('❌ **Hata:** Ne aratmak istiyorsun kanka? Yazman lazım.\n*Örnek:* `.ara SNT`, `.ara SĞK`, `.ara 🇲🇫`');
        }

        // İstediğin tüm mevkiler ve Türkçe uzun yazımları için kelime haritası
        let kriter = arananKelime;
        const kontrol = arananKelime.toUpperCase().trim();
        const mevkiHaritasi = {
            'SANTRAFOR': 'SNT', 'SNT': 'SNT',
            'SAĞ AÇIK': 'SĞK', 'SAG AÇIK': 'SĞK', 'SĞK': 'SĞK',
            'SOL AÇIK': 'SLK', 'SLK': 'SLK',
            'ORTA SAHA': 'OSS', 'ORTASHA': 'OSS', 'OSS': 'OSS',
            'SAĞ BEK': 'SGB', 'SAG BEK': 'SGB', 'SGB': 'SGB',
            'SOL BEK': 'SLB', 'SLB': 'SLB',
            'STOPER': 'STP', 'STP': 'STP',
            'KALECİ': 'KL', 'KALE': 'KL', 'KL': 'KL'
        };

        // Eğer girilen kelime listede varsa (Örn: "Sağ Bek" yazıldıysa) bunu "SGB"ye çevirir
        if (mevkiHaritasi[kontrol]) {
            kriter = mevkiHaritasi[kontrol];
        }

        try {
            // Önbellek (Cache) hatasını bitiren kısım: Sunucudaki TÜM üyeleri API'den canlı çekiyoruz
            const tumUyeler = await message.guild.members.fetch({ force: true });
            
            // Düzenli ifade (Regex) ile girdinin emoji/bayrak içerip içermediğini kontrol ediyoruz
            const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
            const emojiVarMi = emojiRegex.test(kriter);

            const sonuclar = tumUyeler.filter(member => {
                const takmaAd = member.displayName || '';
                const kullaniciAdi = member.user.username || '';

                if (emojiVarMi) {
                    // Bayraklarda kod yapısının bozulmaması için doğrudan ham haliyle aratıyoruz
                    return takmaAd.includes(kriter) || kullaniciAdi.includes(kriter);
                } else {
                    // Normal metinlerde (SNT, İsim vb.) büyük/küçük harf duyarsız aratıyoruz
                    return takmaAd.toUpperCase().includes(kriter.toUpperCase()) || 
                           kullaniciAdi.toUpperCase().includes(kriter.toUpperCase());
                }
            });

            if (sonuclar.size === 0) {
                return message.reply(`❌ Kriterlere veya isme uygun (\`${arananKelime}\`) oyuncu bulunamadı kanka!`);
            }

            // İlk 20 sonucu listeliyoruz (Discord sınırlarına takılmamak için)
            const liste = sonuclar
                .map(m => `👤 ${m.toString()} - \`${m.displayName}\``)
                .slice(0, 20)
                .join('\n');

            const embed = new EmbedBuilder()
                .setTitle('🔍 Oyuncu / Mevki Arama Sonuçları')
                .setDescription(`🔎 **Aranan:** \`${arananKelime}\` ${kriter !== arananKelime ? `(\`${kriter}\` olarak arandı)` : ''}\n\n${liste}`)
                .setColor(0x3498db)
                .setFooter({ text: 'Crusy & Reality League Arama Motoru' });

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await message.reply('❌ Oyuncular taranırken teknik bir hata oluştu kanka, Railway loglarını kontrol et!');
        }
    }
});

// Bot Tokeni (Railway panelindeki Variables kısmına TOKEN adıyla eklediğin gizli kodla çalışır)
client.login(process.env.TOKEN);
