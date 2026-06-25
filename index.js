const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Maçları kontrol etmek ve durdurabilmek için global hafıza
let aktifMaclar = new Map();

// Takımları ve kadroları hafızada tutacak ana veri yapısı
// Yapı: { "Galatasaray": { oyuncular: [ {isim: 'Çağatay', mevki: 'SNT'} ] } }
let ligVerisi = {};

client.once('ready', () => {
    console.log(`🚀 Lig Yönetimi ve Maç Motoru Aktif: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('.') && !message.content.startsWith('!')) return;

    const prefix = message.content[0];
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ==========================================
    // 1. .takimkur KOMUTU
    // ==========================================
    if (prefix === '.' && (command === 'takimkur' || command === 'takımkur')) {
        const takimAdi = args.join(' ').trim();
        if (!takimAdi) {
            return message.reply('❌ **Hata:** Kurulacak takımın adını yazmalısın kanka!\n*Örnek:* `.takimkur Galatasaray`');
        }

        if (ligVerisi[takimAdi]) {
            return message.reply(`❌ **Hata:** \`${takimAdi}\` adında bir takım zaten kurulmuş kanka!`);
        }

        // Yeni takımı oluşturuyoruz
        ligVerisi[takimAdi] = { oyuncular: [] };

        const kurEmbed = new EmbedBuilder()
            .setTitle('🛡️ Yeni Takım Kuruldu')
            .setDescription(`**\`${takimAdi}\`** başarıyla lige eklendi! Artık bu takıma oyuncu ekleyebilirsin kanka.`)
            .setColor(0x2ECC71)
            .setFooter({ text: 'Reality & Crusy League' });

        return message.reply({ embeds: [kurEmbed] });
    }

    // ==========================================
    // 2. .oyuncuekle KOMUTU
    // ==========================================
    if (prefix === '.' && command === 'oyuncuekle') {
        const metin = args.join(' ');
        if (!metin || !metin.includes('|')) {
            return message.reply('❌ **Hata:** Oyuncu eklemek için formatı doğru yaz kanka!\n*Örnek:* `.oyuncuekle Galatasaray | Çağatay | SNT`');
        }

        const parcalar = metin.split('|');
        const takimAdi = parcalar[0].trim();
        const oyuncuAdi = parcalar[1].trim();
        const mevki = parcalar[2].trim().toUpperCase();

        // Takım var mı kontrolü
        if (!ligVerisi[takimAdi]) {
            return message.reply(`❌ **Hata:** \`${takimAdi}\` adında bir takım bulunamadı! Önce \`.takimkur ${takimAdi}\` yazarak takımı kurmalısın kanka.`);
        }

        // Oyuncuyu takıma ekle
        ligVerisi[takimAdi].oyuncular.push({ isim: oyuncuAdi, mevki: mevki });

        const kadroEmbed = new EmbedBuilder()
            .setTitle('📝 Kadroya Oyuncu Eklendi')
            .setDescription(`**Takım:** \`${takimAdi}\`\n**Oyuncu:** \`${oyuncuAdi}\`\n**Mevki:** \`${mevki}\``)
            .setColor(0x3498DB)
            .setFooter({ text: `${takimAdi} toplam oyuncu sayısı: ${ligVerisi[takimAdi].oyuncular.length}` });

        return message.reply({ embeds: [kadroEmbed] });
    }

    // ==========================================
    // 3. .kadro KOMUTU (Kadroya Bakma)
    // ==========================================
    if (prefix === '.' && command === 'kadro') {
        const takimAdi = args.join(' ').trim();
        if (!takimAdi) {
            return message.reply('❌ **Hata:** Hangi takımın kadrosuna bakmak istiyorsun kanka?\n*Örnek:* `.kadro Galatasaray`');
        }

        if (!ligVerisi[takimAdi]) {
            return message.reply(`❌ **Hata:** \`${takimAdi}\` adında bir takım bulunamadı!`);
        }

        const takimKadro = ligVerisi[takimAdi].oyuncular;
        if (takimKadro.length === 0) {
            return message.reply(`ℹ️ \`${takimAdi}\` takımının henüz bir oyuncusu yok kanka! \`.oyuncuekle\` ile ekleme yapabilirsin.`);
        }

        // Kadroyu listeliyoruz
        const oyuncuListesi = takimKadro.map((o, index) => `${index + 1}. **${o.isim}** - \`${o.mevki}\``).join('\n');

        const kadroBakEmbed = new EmbedBuilder()
            .setTitle(`📋 ${takimAdi} - Takım Kadrosu`)
            .setDescription(oyuncuListesi)
            .setColor(0xF1C40F)
            .setFooter({ text: `Toplam Oyuncu: ${takimKadro.length}` });

        return message.reply({ embeds: [kadroBakEmbed] });
    }

    // ==========================================
    // 4. .takimliste KOMUTU
    // ==========================================
    if (prefix === '.' && (command === 'takimliste' || command === 'takımliste')) {
        const tumTakimlar = Object.keys(ligVerisi);

        if (tumTakimlar.length === 0) {
            return message.reply('ℹ️ Ligde henüz kurulmuş hiçbir takım yok kanka!');
        }

        const listeMetni = tumTakimlar.map((t, index) => `${index + 1}. 🛡️ **${t}** (${ligVerisi[t].oyuncular.length} Oyuncu)`).join('\n');

        const listeEmbed = new EmbedBuilder()
            .setTitle('🏆 Ligteki Tüm Takımlar')
            .setDescription(listeMetni)
            .setColor(0x9B59B6)
            .setFooter({ text: 'Reality & Crusy League' });

        return message.reply({ embeds: [listeEmbed] });
    }

    // ==========================================
    // 5. .maçbaşlat KOMUTU (30 Saniye - Ayrı Mesajlı)
    // ==========================================
    if (prefix === '.' && (command === 'maçbaşlat' || command === 'macbaslat')) {
        const macMetni = args.join(' ');
        if (!macMetni || !macMetni.includes('vs')) {
            return message.reply('❌ **Hata:** Takımları doğru yaz kanka! \n*Örnek:* `.maçbaşlat Galatasaray vs Anadolu FK`');
        }

        const takimlar = macMetni.split('vs');
        const takimA = takimlar[0].trim();
        const takimB = takimlar[1].trim();

        if (aktifMaclar.has(message.channel.id)) {
            return message.reply('❌ **Hata:** Bu kanalda zaten devam eden bir maç var kanka!');
        }

        let skorA = 0;
        let skorB = 0;
        let mevcutDakika = 0;

        const baslangicEmbed = new EmbedBuilder()
            .setTitle('🏟️ Mücadele Başladı!')
            .setDescription(`**${takimA}** ${skorA} - ${skorB} **${takimB}**\n\n🟢 Hakem düdüğünü çaldı, dev maç başladı!`)
            .setColor(0x2ECC71)
            .setFooter({ text: 'Maç Süresi: 25 Oyun Dakikası (Toplam 30 Gerçek Saniye)' });

        await message.channel.send({ embeds: [baslangicEmbed] });

        const olayUret = (dakika) => {
            const oyuncuSec = (takim) => {
                if (ligVerisi[takim] && ligVerisi[takim].oyuncular.length > 0) {
                    const oList = ligVerisi[takim].oyuncular;
                    const r = oList[Math.floor(Math.random() * oList.length)];
                    return `\`${r.isim} (${r.mevki})\``;
                }
                return `**${takim} oyuncusu**`;
            };

            const sans = Math.random();

            if (sans < 0.15) { // GOL VE ASİST
                const golAtan = Math.random() > 0.5 ? takimA : takimB;
                let golMetni = "";
                
                if (golAtan === takimA) {
                    skorA++;
                    golMetni = `⚽ **GOL! [Dk: ${dakika}']** ${oyuncuSec(takimA)} topu ağlara gönderdi! Asist: ${oyuncuSec(takimA)}. \n📊 **Skor:** **${takimA}** ${skorA} - ${skorB} **${takimB}**`;
                } else {
                    skorB++;
                    golMetni = `⚽ **GOL! [Dk: ${dakika}']** ${oyuncuSec(takimB)} fileleri sarstı! Asist: ${oyuncuSec(takimB)}. \n📊 **Skor:** **${takimA}** ${skorA} - ${skorB} **${takimB}**`;
                }
                return { t: 'GOL', m: golMetni, c: 0x2ECC71 };

            } else if (sans < 0.30) { // KURTARIŞ
                const defansTakim = Math.random() > 0.5 ? takimA : takimB;
                return { t: 'KURTARIŞ', m: `🧤 **Müthiş Kurtarış! [Dk: ${dakika}']** ${oyuncuSec(defansTakim)} kalesinde adeta devleşti, mutlak golü önledi!`, c: 0x3498DB };

            } else if (sans < 0.42) { // MÜCADELE
                return { t: 'MÜCADELE', m: `⚔️ **Kıran Kırana Mücadele! [Dk: ${dakika}']** Orta sahada iki takım oyuncuları arasında büyük bir taktik savaş yaşanıyor.`, c: 0x95A5A6 };

            } else if (sans < 0.52) { // SARI KART
                const kartliTakim = Math.random() > 0.5 ? takimA : takimB;
                return { t: 'SARI KART', m: `🟨 **Sarı Kart! [Dk: ${dakika}']** Hakem sert müdahale sonrası ${oyuncuSec(kartliTakim)} isimli oyuncuya sarı kart gösterdi!`, c: 0xF1C40F };

            } else if (sans < 0.60) { // KIRMIZI KART
                const kirmiziTakim = Math.random() > 0.5 ? takimA : takimB;
                return { t: 'KIRMIZI KART', m: `🟥 **Kırmızı Kart! [Dk: ${dakika}']** Şok gelişme! ${oyuncuSec(kirmiziTakim)} doğrudan kırmızı kartla oyun dışı kaldı!`, c: 0x960018 };

            } else if (sans < 0.72) { // VAR HAKEM
                return { t: 'VAR', m: `🖥️ **VAR İncelemesi! [Dk: ${dakika}']** Pozisyon şüpheli. Hakem ekranın başına gitti... Karar değişmiyor.`, c: 0x9B59B6 };

            } else if (sans < 0.82) { // KAVGA
                return { t: 'KAVGA', m: `🔥 **Saha Karıştı! [Dk: ${dakika}']** Faul sonrası iki takım oyuncuları arasında kavga çıktı. Hakem ortamı sakinleştirmeye çalışıyor!`, c: 0xE67E22 };

            } else { // NORMAL POZİSYON
                return { t: 'POZİSYON', m: `🏃 **Atak Hatası! [Dk: ${dakika}']** Gelişen tehlikeli hücumda son vuruş başarısız, top auta gitti.`, c: 0x7F8C8D };
            }
        };

        const macDongusu = setInterval(async () => {
            mevcutDakika++;

            const olay = olayUret(mevcutDakika);

            const olayEmbed = new EmbedBuilder()
                .setTitle(`🎙️ Canlı Anlatım - Dk: ${mevcutDakika}'`)
                .setDescription(olay.m)
                .setColor(olay.c);

            await message.channel.send({ embeds: [olayEmbed] }).catch(e => console.error(e));

            if (mevcutDakika >= 25) {
                clearInterval(macDongusu);
                aktifMaclar.delete(message.channel.id);

                let sonucMetni = `🏁 **Düdük Çaldı, Maç Bitti!** \n\n📊 **Final Skoru:** **${takimA}** ${skorA} - ${skorB} **${takimB}**\n\n`;
                if (skorA > skorB) sonucMetni += `🎉 Kazanan: **${takimA}**`;
                else if (skorB > skorA) sonucMetni += `🎉 Kazanan: **${takimB}**`;
                else sonucMetni += `🤝 Mücadele berabere sonuçlandı!`;

                const bitisEmbed = new EmbedBuilder()
                    .setTitle('🏁 MAÇ SONUCU')
                    .setDescription(sonucMetni)
                    .setColor(0xE74C3C)
                    .setFooter({ text: '30 saniyelik simülasyon başarıyla tamamlandı.' });

                await message.channel.send({ embeds: [bitisEmbed] });
            }

        }, 1200); // 30 saniyede 25 dakikayı tamamlar

        aktifMaclar.set(message.channel.id, {
            dongu: macDongusu,
            takimA: takimA,
            takimB: takimB,
            skorA: () => skorA,
            skorB: () => skorB
        });
    }

    // ==========================================
    // 6. !durdurmac KOMUTU (Erken Bitiş)
    // ==========================================
    if (prefix === '!' && (command === 'durdurmac' || command === 'durdurmaç')) {
        const macVerisi = aktifMaclar.get(message.channel.id);

        if (!macVerisi) {
            return message.reply('❌ **Hata:** Şu anda bu kanalda oynanan aktif bir maç yok kanka!');
        }

        clearInterval(macVerisi.dongu);
        aktifMaclar.delete(message.channel.id);

        const durdurEmbed = new EmbedBuilder()
            .setTitle('🛑 Maç Yarıda Kesildi!')
            .setDescription(`Hakem olağanüstü durumlardan dolayı maçı erken bitirdi!\n\n📊 **Kalan Skor:** **${macVerisi.takimA}** ${macVerisi.skorA()} - ${macVerisi.skorB()} **${macVerisi.takimB}**`)
            .setColor(0xFF0000)
            .setFooter({ text: 'Maç !durdurmac komutu ile iptal edildi.' });

        return message.channel.send({ embeds: [durdurEmbed] });
    }
});

client.login(process.env.TOKEN);

