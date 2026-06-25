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

// Kurduğun kadroları eksiksiz tutan ana yapı
let ligVerisi = {};

client.once('ready', () => {
    console.log(`🚀 Uzun Anlatımlı Maç Motoru Aktif: ${client.user.tag}`);
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
    // 5. .macbaslat KOMUTU (UZUN SPİKER ANLATIMLI)
    // ==========================================
    if (prefix === '.' && (command === 'maçbaşlat' || command === 'macbaslat')) {
        const macMetni = args.join(' ');
        if (!macMetni || !macMetni.includes('vs')) return message.reply('❌ **Hata:** Örnek: `.macbaslat Juventus vs Dortmund`');

        const takimlar = macMetni.split('vs');
        const takimA = takimlar[0].trim();
        const takimB = takimlar[1].trim();

        if (aktifMaclar.has(message.channel.id)) return message.reply('❌ **Hata:** Bu kanalda zaten maç oynanıyor!');

        let skorA = 0;
        let skorB = 0;
        let mevcutDakika = 0;
        let gecenSaniye = 0;

        const baslangicEmbed = new EmbedBuilder()
            .setTitle('🏟️ Mücadele Başladı!')
            .setDescription(`**${takimA}** ${skorA} - ${skorB} **${takimB}**\n\n🟢 Hakem son kontrollerini yaptı, düdüğünü çaldı ve 25 dakikalık (2500 saniye) dev simülasyon resmen başladı! İki takıma da başarılar dileriz!`)
            .setColor(0x2ECC71)
            .setFooter({ text: 'Başlangıç | Süre: 0s' });

        await message.channel.send({ embeds: [baslangicEmbed] });

        // Gelişmiş Uzun Pozisyon Üretici
        const olayUret = (dakika) => {
            const oyuncuSec = (takim) => {
                if (ligVerisi[takim] && ligVerisi[takim].oyuncular.length > 0) {
                    const oList = ligVerisi[takim].oyuncular;
                    const r = oList[Math.floor(Math.random() * oList.length)];
                    return `\`${r.isim} (${r.mevki})\``;
                }
                return `**${takim} oyuncusu**`;
            };

            const pA1 = oyuncuSec(takimA);
            const pA2 = oyuncuSec(takimA);
            const pB1 = oyuncuSec(takimB);
            const pB2 = oyuncuSec(takimB);

            const sans = Math.random();

            if (sans < 0.16) { // DETAYLI GOL ANLATIMI
                const golAtan = Math.random() > 0.5 ? takimA : takimB;
                if (golAtan === takimA) {
                    skorA++;
                    return {
                        m: `⚽ **İNANILMAZ BİR GOL!** ${takimA} takımı orta sahada mükemmel paslaşıyor. ${pA2} şık bir çalımla rakibini ekarte etti ve derinlemesine bir pas gönderdi! Ceza sahası çizgisi üzerinde topla buluşan ${pA1}, kalecinin öne çıktığını gördü ve uzak köşeye muazzam bir plase vuruş yaptı! Top çatala gidiyor, kaleci çaresiz! \n\n🅰️ **Asist:** ${pA2}\n📊 **Skor:** **${takimA}** ${skorA} - ${skorB} **${takimB}**`,
                        c: 0x2ECC71
                    };
                } else {
                    skorB++;
                    return {
                        m: `⚽ **TOP AĞLARDA! GOL!** ${takimB} sol kanattan fırtına gibi geliyor! ${pB2} topu çizgiye kadar taşıdı, ceza sahasına doğru harika bir orta kesti. Savunmanın arasından çok iyi yükselen ${pB1} kafayı vuruyor ve meşin yuvarlağı ağlarla buluşturuyor! Deplasman ekibi bu dakikada tribünleri ayağa kaldırıyor! \n\n🅰️ **Asist:** ${pB2}\n📊 **Skor:** **${takimA}** ${skorA} - ${skorB} **${takimB}**`,
                        c: 0x2ECC71
                    };
                }
            } else if (sans < 0.30) { // KURTARIŞ
                return {
                    m: `🧤 **KALECİ DEVLEŞTİ! MUTLAK GOL KAÇTI!** Gelişen tehlikeli hücumda, ceza sahası içinde bomboş kalan ${Math.random() > 0.5 ? pA1 : pB1} kaleyi tam karşıdan gören bir noktadan çok sert vurdu! Ancak kalede adeta etten bir duvar var; kaleci inanılmaz bir refleksle uzanıyor ve parmaklarının ucuyla topu kornere çelmeyi başarıyor! Müthiş kurtarış!`,
                    c: 0x3498DB
                };
            } else if (sans < 0.44) { // MÜCADELE
                return {
                    m: `⚔️ **ORTA SAHADA SAVAŞ VAR!** Oyun bu dakikalarda adeta kördüğüme döndü. ${takimA} takımında ${pA1} orta sahada topu kapmak için basıyor fakat ${takimB} takımından ${pB1} vücudunu çok iyi siper ederek topu saklamayı başardı. İki takım da orta alanı geçmekte zorlanıyor, fiziksel mücadele hat safhada!`,
                    c: 0x95A5A6
                };
            } else if (sans < 0.56) { // SARI KART
                return {
                    m: `🟨 **HAKEM CEZAYI KESTİ! SARI KART!** Hızlı gelişen kontratakta ${pA1} rakibini geçmek isterken, arkadan gelen ${pB1} tehlikeli bir kayarak müdahalede bulundu. Oyuncu yerde acı içinde kıvranırken hakem avantajı oynatmadı, oyunu hemen durdurdu ve cebinden sarı kartı çıkartarak sert bir dille uyarıda bulundu!`,
                    c: 0xF1C40F
                };
            } else if (sans < 0.65) { // KIRMIZI KART
                return {
                    m: `🟥 **ŞOK GELİŞME! DOĞRUDAN KIRMIZI KART!** Maçın kader anı! ${pB2} kaleciyle karşı karşıya kalmak üzereyken, ${pA1} arkadan bilerek yaptığı çok sert müdahaleyle rakibini yere indirdi. Hakem tereddütsüz düdüğünü çaldı, koşarak pozisyon yerine geldi ve elini arka cebine attı: DOĞRUDAN KIRMIZI KART! Takım sahada 10 kişi kalıyor!`,
                    c: 0x960018
                };
            } else if (sans < 0.76) { // VAR HAKEM
                return {
                    m: `🖥️ **VAR İNCELEMESİ! ORTAMLAR GERGİN!** Ceza sahası içerisindeki pozisyonda ${pA1} yerde kaldı ve tüm takım penaltı bekliyor. Hakem önce oyunu devam ettirdi ancak VAR odasından gelen kulaklık uyarısıyla oyunu durdurdu. Şu anda hakem kenara geldi, ekranın başında pozisyonu ağır çekimde inceliyor... Ve karar: Penaltı yok, oyun kaldığı yerden devam ediyor!`,
                    c: 0x9B59B6
                };
            } else if (sans < 0.86) { // KAVGA
                return {
                    m: `🔥 **SAHA BİR ANDA KARIŞTI! KAVGA ÇIKTI!** Taç çizgisi kenarında ${pA1} ve ${pB1} arasındaki ikili mücadele sonrası sinirler gerildi! İki oyuncu kafa kafaya geldi ve birbirlerini itmeye başladı. Yedek kulübeleri ve diğer futbolcular da hemen olay yerine koştu, saha bir anda ana baba gününe döndü. Hakem yardımcılarını yanına çağırıyor, ortalık çok gergin!`,
                    c: 0xE67E22
                };
            } else { // DETAYLI ATAK KAÇTI
                return {
                    m: `🏃 **ŞANS ANLARI! TOP AZ FARKLA DIŞARIDA!** ${takimB} takımı sağ kanattan organize geldi. ${pB1} ceza sahasına girmeden yay üzerindeki ${pB2}'ye pas çıkardı. O da gelişine yer volesiyle çok sert vurdu! Top kalecinin bakışları arasında yan direği sıyırarak auta çıkıyor. Tribünlerden 'Ah' sesleri yükseliyor!`,
                    c: 0x7F8C8D
                };
            }
        };

        // 100 saniyede bir ayrı mesaj fırlatır
        const macDongusu = setInterval(async () => {
            mevcutDakika++;
            gecenSaniye += 100;

            const olay = olayUret(mevcutDakika);
            
            const olayEmbed = new EmbedBuilder()
                .setTitle(`🎙️ Canlı Anlatım Paneli`)
                .setDescription(`📊 **Güncel Skor:** **${takimA}** ${skorA} - ${skorB} **${takimB}**\n\n⏱️ **Maç Dakikası:** \`${mevcutDakika}'\`\n⏱️ **Geçen Süre:** \`${gecenSaniye} Saniye\`\n\n📢 **Spiker Anlatımı:**\n${olay.m}`)
                .setColor(olay.c)
                .setFooter({ text: `Gerçek zamanlı Reality & Crusy League simülasyonu` });

            await message.channel.send({ embeds: [olayEmbed] }).catch(e => console.error(e));

            // 25. dakikada bitiş
            if (mevcutDakika >= 25) {
                clearInterval(macDongusu);
                aktifMaclar.delete(message.channel.id);

                let sonucMetni = `🏁 **Düdük Çaldı, 90 Dakika Sona Erdi!** \n\n📊 **Final Skoru:** **${takimA}** ${skorA} - ${skorB} **${takimB}**\n⏱️ **Toplam Süre:** \`${gecenSaniye} Saniye\`\n\n`;
                if (skorA > skorB) sonucMetni += `🎉 Zorlu 25 dakikalık maratonun galibi muhteşem performansıyla **${takimA}** oluyor!`;
                else if (skorB > skorA) sonucMetni += `🎉 Sahadan üstün ayrılan ve 3 puanı hanesine yazdıran takım **${takimB}** oluyor!`;
                else sonucMetni += `🤝 İki takım da sahadaki her şeyini verdi ancak eşitlik bozulmadı. Dostluk kazandı!`;

                const bitisEmbed = new EmbedBuilder().setTitle('🏁 MAÇ SONUCU').setDescription(sonucMetni).setColor(0xE74C3C);
                await message.channel.send({ embeds: [bitisEmbed] });
            }

        }, 100000);

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
            .setDescription(`Hakem olağanüstü olaylardan ötürü maçı tatil etti!\n\n📊 **Kalan Skor:** **${macVerisi.takimA}** ${macVerisi.skorA()} - ${macVerisi.skorB()} **${macVerisi.takimB}**`)
            .setColor(0xFF0000);
        return message.channel.send({ embeds: [durdurEmbed] });
    }
});

client.login(process.env.TOKEN);
                
            
