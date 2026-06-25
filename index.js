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
let ligVerisi = {};

client.once('ready', () => {
    console.log(`🚀 25 Dakikalık Gerçek Zamanlı Maç Motoru Aktif: ${client.user.tag}`);
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
        if (!takimAdi) return message.reply('❌ **Hata:** Kurulacak takımın adını yazmalısın kanka!');
        if (ligVerisi[takimAdi]) return message.reply(`❌ **Hata:** \`${takimAdi}\` zaten kurulmuş!`);

        ligVerisi[takimAdi] = { oyuncular: [] };
        const kurEmbed = new EmbedBuilder()
            .setTitle('🛡️ Yeni Takım Kuruldu')
            .setDescription(`**\`${takimAdi}\`** lige eklendi!`)
            .setColor(0x2ECC71);
        return message.reply({ embeds: [kurEmbed] });
    }

    // ==========================================
    // 2. .oyuncuekle KOMUTU
    // ==========================================
    if (prefix === '.' && command === 'oyuncuekle') {
        const metin = args.join(' ');
        if (!metin || !metin.includes('|')) return message.reply('❌ **Hata:** Format: `.oyuncuekle Takım | İsim | Mevki`');

        const parcalar = metin.split('|');
        const takimAdi = parcalar[0].trim();
        const oyuncuAdi = parcalar[1].trim();
        const mevki = parcalar[2].trim().toUpperCase();

        if (!ligVerisi[takimAdi]) return message.reply(`❌ **Hata:** Önce \`.takimkur ${takimAdi}\` yapmalısın!`);

        ligVerisi[takimAdi].oyuncular.push({ isim: oyuncuAdi, mevki: mevki });
        const kadroEmbed = new EmbedBuilder()
            .setTitle('📝 Oyuncu Eklendi')
            .setDescription(`**${takimAdi}** -> **${oyuncuAdi} (${mevki})**`)
            .setColor(0x3498DB);
        return message.reply({ embeds: [kadroEmbed] });
    }

    // ==========================================
    // 3. .kadro KOMUTU
    // ==========================================
    if (prefix === '.' && command === 'kadro') {
        const takimAdi = args.join(' ').trim();
        if (!ligVerisi[takimAdi]) return message.reply(`❌ **Hata:** Takım bulunamadı!`);

        const takimKadro = ligVerisi[takimAdi].oyuncular;
        if (takimKadro.length === 0) return message.reply(`ℹ️ Takımın oyuncusu yok.`);

        const oyuncuListesi = takimKadro.map((o, index) => `${index + 1}. **${o.isim}** - \`${o.mevki}\``).join('\n');
        const kadroBakEmbed = new EmbedBuilder()
            .setTitle(`📋 ${takimAdi} Kadrosu`)
            .setDescription(oyuncuListesi)
            .setColor(0xF1C40F);
        return message.reply({ embeds: [kadroBakEmbed] });
    }

    // ==========================================
    // 4. .takimliste KOMUTU
    // ==========================================
    if (prefix === '.' && (command === 'takimliste' || command === 'takımliste')) {
        const tumTakimlar = Object.keys(ligVerisi);
        if (tumTakimlar.length === 0) return message.reply('ℹ️ Kurulmuş takım yok.');

        const listeMetni = tumTakimlar.map((t, index) => `${index + 1}. 🛡️ **${t}** (${ligVerisi[t].oyuncular.length} Oyuncu)`).join('\n');
        const listeEmbed = new EmbedBuilder().setTitle('🏆 Tüm Takımlar').setDescription(listeMetni).setColor(0x9B59B6);
        return message.reply({ embeds: [listeEmbed] });
    }

    // ==========================================
    // 5. .macbaslat KOMUTU (TAM 25 DAKİKA / 2500 SANİYE)
    // ==========================================
    if (prefix === '.' && (command === 'maçbaşlat' || command === 'macbaslat')) {
        const macMetni = args.join(' ');
        if (!macMetni || !macMetni.includes('vs')) return message.reply('❌ **Hata:** Örnek: `.macbaslat Galatasaray vs Dortmund`');

        const takimlar = macMetni.split('vs');
        const takimA = takimlar[0].trim();
        const takimB = takimlar[1].trim();

        if (aktifMaclar.has(message.channel.id)) return message.reply('❌ **Hata:** Bu kanalda zaten maç oynanıyor!');

        let skorA = 0;
        let skorB = 0;
        let mevcutDakika = 0;

        const baslangicEmbed = new EmbedBuilder()
            .setTitle('🏟️ Mücadele Başladı!')
            .setDescription(`**${takimA}** ${skorA} - ${skorB} **${takimB}**\n\n🟢 Hakem düdüğü çaldı, 25 dakikalık dev simülasyon başladı!`)
            .setColor(0x2ECC71)
            .setFooter({ text: 'Maç Süresi: Tam 25 Dakika sürecektir (2500 saniye).' });

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

            if (sans < 0.15) { // GOL
                const golAtan = Math.random() > 0.5 ? takimA : takimB;
                let golMetni = "";
                if (golAtan === takimA) {
                    skorA++;
                    golMetni = `⚽ **GOL! [Dk: ${dakika}']** ${oyuncuSec(takimA)} topu ağlara gönderdi! Asist: ${oyuncuSec(takimA)}. \n📊 **Skor:** **${takimA}** ${skorA} - ${skorB} **${takimB}**`;
                } else {
                    skorB++;
                    golMetni = `⚽ **GOL! [Dk: ${dakika}']** ${oyuncuSec(takimB)} fileleri sarstı! Asist: ${oyuncuSec(takimB)}. \n📊 **Skor:** **${takimA}** ${skorA} - ${skorB} **${takimB}**`;
                }
                return { m: golMetni, c: 0x2ECC71 };
            } else if (sans < 0.30) { // KURTARIŞ
                return { m: `🧤 **Müthiş Kurtarış! [Dk: ${dakika}']** ${oyuncuSec(Math.random() > 0.5 ? takimA : takimB)} kalesinde devleşti!`, c: 0x3498DB };
            } else if (sans < 0.42) { // MÜCADELE
                return { m: `⚔️ **Kıran Kırana Mücadele! [Dk: ${dakika}']** İki takım oyuncuları arasında orta sahada büyük savaş var.`, c: 0x95A5A6 };
            } else if (sans < 0.52) { // SARI KART
                return { m: `🟨 **Sarı Kart! [Dk: ${dakika}']** Hakem sert faul sonrası ${oyuncuSec(Math.random() > 0.5 ? takimA : takimB)} oyuncusuna sarı kart çıkardı!`, c: 0xF1C40F };
            } else if (sans < 0.60) { // KIRMIZI KART
                return { m: `🟥 **Kırmızı Kart! [Dk: ${dakika}']** Şok gelişme! ${oyuncuSec(Math.random() > 0.5 ? takimA : takimB)} kırmızı kartla oyun dışı!`, c: 0x960018 };
            } else if (sans < 0.72) { // VAR
                return { m: `🖥️ **VAR İncelemesi! [Dk: ${dakika}']** Hakem ekranın başına gitti... Karar değişmedi.`, c: 0x9B59B6 };
            } else if (sans < 0.82) { // KAVGA
                return { m: `🔥 **Saha Karıştı! [Dk: ${dakika}']** Oyuncular birbirine girdi, hakem ortalığı yatıştırıyor!`, c: 0xE67E22 };
            } else { // POZİSYON
                return { m: `🏃 **Atak Kaçtı! [Dk: ${dakika}']** Tehlikeli gelişen hücumda top dışarı çıktı.`, c: 0x7F8C8D };
            }
        };

        // TAM 100 SANİYEDE BİR TETİKLENİR (100000 ms)
        // Toplam 25 adım sürecek -> 25 * 100 = 2500 saniye (25 dakika gerçek zaman)
        const macDongusu = setInterval(async () => {
            mevcutDakika++;

            const olay = olayUret(mevcutDakika);
            const olayEmbed = new EmbedBuilder()
                .setTitle(`🎙️ Canlı Anlatım - Dk: ${mevcutDakika}'`)
                .setDescription(olay.m)
                .setColor(olay.c);

            // HER POZİSYON AYRI MESAJ OLARAK ATILIR
            await message.channel.send({ embeds: [olayEmbed] }).catch(e => console.error(e));

            // 25. Dakikada maçı bitir
            if (mevcutDakika >= 25) {
                clearInterval(macDongusu);
                aktifMaclar.delete(message.channel.id);

                let sonucMetni = `🏁 **Düdük Çaldı, Maç Bitti!** \n\n📊 **Final Skoru:** **${takimA}** ${skorA} - ${skorB} **${takimB}**\n\n`;
                if (skorA > skorB) sonucMetni += `🎉 Kazanan: **${takimA}**`;
                else if (skorB > skorA) sonucMetni += `🎉 Kazanan: **${takimB}**`;
                else sonucMetni += `🤝 Mücadele berabere bitti!`;

                const bitisEmbed = new EmbedBuilder().setTitle('🏁 MAÇ SONUCU').setDescription(sonucMetni).setColor(0xE74C3C);
                await message.channel.send({ embeds: [bitisEmbed] });
            }

        }, 100000); // 100 Saniye gecikme

        aktifMaclar.set(message.channel.id, {
            dongu: macDongusu,
            takimA: takimA,
            takimB: takimB,
            skorA: () => skorA,
            skorB: () => skorB
        });
    }

    // ==========================================
    // 6. !durdurmac KOMUTU
    // ==========================================
    if (prefix === '!' && (command === 'durdurmac' || command === 'durdurmaç')) {
        const macVerisi = aktifMaclar.get(message.channel.id);
        if (!macVerisi) return message.reply('❌ **Hata:** Aktif maç yok!');

        clearInterval(macVerisi.dongu);
        aktifMaclar.delete(message.channel.id);

        const durdurEmbed = new EmbedBuilder()
            .setTitle('🛑 Maç Yarıda Kesildi!')
            .setDescription(`📊 **Kalan Skor:** **${macVerisi.takimA}** ${macVerisi.skorA()} - ${macVerisi.skorB()} **${macVerisi.takimB}**`)
            .setColor(0xFF0000);
        return message.channel.send({ embeds: [durdurEmbed] });
    }
});

client.login(process.env.TOKEN);
                    
