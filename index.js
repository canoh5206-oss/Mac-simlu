const { 
    Client, 
    GatewayIntentBits, 
    ChannelType, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ComponentType
} = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = ".";

// ==========================================
// ID TANIMLAMALARI
// ==========================================
const ROLLER = {
    KAYITSIZ: "1522283479726031068",
    FUTBOLCU: "1522283476517257376",
    TEKNIK_DIREKTOR: "1522283471219982528",
    BASKAN: "1522283468711788697",
    KAYIT_YETKILISI: "1522283453721219072",
    DEGER_YETKILISI: "1522283459056373791",
    UST_YETKILI: "1461448489656647905"
};

const KANALLAR = {
    HOZ_GELDIN_LOG: "1522283489133858837",
    KAYIT_BAŞARILI_LOG: "1522283544683090133",
    DEGER_LOG: "1522283586756280340"
};

// ==========================================
// YEREL JSON VERİTABANI SİSTEMİ
// ==========================================
let data = { oyuncular: {}, takimlar: {} };
if (fs.existsSync('./database.json')) {
    try {
        data = JSON.parse(fs.readFileSync('./database.json', 'utf8'));
    } catch (e) {
        console.error("Veritabanı okuma hatası, sıfırlanıyor...", e);
    }
}

function saveDB() {
    fs.writeFileSync('./database.json', JSON.stringify(data, null, 2));
}

function profilGereksinim(userId) {
    if (!data.oyuncular[userId]) {
        data.oyuncular[userId] = {
            ant: 0,
            gol: 0,
            direk: 0,
            kurtaris: 0,
            deger: 0, 
            takim: "Yok",
            antSüre: 0,
            penSüre: 0
        };
        saveDB();
    }
}

// Sayısal değeri formatlama (Örn: 4000000 -> 4m)
function formatDeger(sayi) {
    if (sayi >= 1000000) return (sayi / 1000000).toFixed(1).replace('.0', '') + 'm';
    if (sayi >= 1000) return (sayi / 1000).toFixed(1).replace('.0', '') + 'k';
    return sayi + ' değer';
}

function parseDeger(metin) {
    let temiz = metin.toLowerCase().trim();
    if (temiz.endsWith('m')) return parseFloat(temiz.replace('m', '')) * 1000000;
    if (temiz.endsWith('k')) return parseFloat(temiz.replace('k', '')) * 1000;
    return parseFloat(temiz) || 0;
}

// ==========================================
// 2. OTOMATİK OTO-ROL & GİRİŞ LOGU
// ==========================================
client.on('guildMemberAdd', async (member) => {
    // Girişte kayıtsız rolünü tanımla
    await member.roles.add(ROLLER.KAYITSIZ).catch(() => null);

    const logKanal = member.guild.channels.cache.get(KANALLAR.HOZ_GELDIN_LOG);
    if (logKanal) {
        logKanal.send(`📥 Sunucu geldi kayıt edin <@&${ROLLER.KAYIT_YETKILISI}> | ${member}`);
    }
});

client.once('ready', () => {
    console.log(`[BOT] ${client.user.tag} başarıyla aktif edildi!`);
});

// ==========================================
// MESAJ KOMUTLARI
// ==========================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ------------------------------------------
    // 1. .yardim MENÜSÜ
    // ------------------------------------------
    if (command === 'yardim') {
        const yardimEmbed = new EmbedBuilder()
            .setColor('#2F3136')
            .setTitle('🏆 Efsane Lig RP - Komut Menüsü')
            .addFields(
                { name: '📝 Kayıt Komutları', value: '`.k @kullanıcı [İsim]` - Butonlu kayıt panelini tetikler.' },
                { name: '🏋️ Gelişim Sistemi', value: '`.ant` - Saatte bir antrenman kasarsınız (Maks 5/5).\n`.pen` - Saatte bir penaltı idmanı (Gol/Direk/Kurtarış) yapar.' },
                { name: '📊 Değer Komutları', value: '`.degerekle @kullanıcı [Miktar]` - Oyuncuya değer yazar.\n`.degercikar @kullanıcı [Miktar]` - Oyuncudan değer düşer.' },
                { name: '🏛️ Kulüp & Lig Yönetimi', value: '`.takimkur @yönetici [Takım]` - Lig takımı kurar.\n`.takimsil [Takım]` - Takımı kaldırır.\n`.takimliste` - Aktif lig takımlarını gösterir.' },
                { name: '📋 Kulüp İçi Transferler', value: '`.oyuncuekle @oyuncu [Takım]` - Kadroya oyuncu transfer eder.\n`.oyuncucikar @oyuncu [Takım]` - Kadrodan oyuncu siler.\n`.kadro [Takım]` - Kulüp kadrosunu ve güncel toplam değerini listeler.' },
                { name: '👤 Profil Bilgisi', value: '`.profil [@kullanıcı]` - Detaylı oyuncu kartını ekrana basar.' }
            )
            .setTimestamp();
        return message.reply({ embeds: [yardimEmbed] });
    }

    // ------------------------------------------
    // 3. .k BUTONLU KAYIT SİSTEMİ
    // ------------------------------------------
    if (command === 'k') {
        if (!message.member.roles.cache.has(ROLLER.KAYIT_YETKILISI)) {
            return message.reply("❌ Bu komutu sadece **Kayıt Yetkilileri** kullanabilir.");
        }

        const hedef = message.mentions.members.first();
        const yeniIsim = args.slice(1).join(" ");

        if (!hedef || !yeniIsim) {
            return message.reply("❌ Yanlış Kullanım! Örnek: `.k @kullanıcı Osimhen | snt | 🇩🇪 | 0` ");
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('kayit_futbolcu').setLabel('Futbolcu').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('kayit_td').setLabel('Teknik Direktör').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('kayit_baskan').setLabel('Başkan').setStyle(ButtonStyle.Success)
        );

        const msg = await message.reply({
            content: `📝 ${hedef} kullanıcısı için rol seçimi yapınız:`,
            components: [row]
        });

        const filter = i => i.user.id === message.author.id;
        const collector = msg.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 30000 });

        collector.on('collect', async i => {
            await i.deferUpdate();
            let secilenRol = "";

            if (i.customId === 'kayit_futbolcu') secilenRol = ROLLER.FUTBOLCU;
            if (i.customId === 'kayit_td') secilenRol = ROLLER.TEKNIK_DIREKTOR;
            if (i.customId === 'kayit_baskan') secilenRol = ROLLER.BASKAN;

            // Rol güncellemeleri ve isim değişikliği
            await hedef.setNickname(yeniIsim).catch(() => null);
            await hedef.roles.remove(ROLLER.KAYITSIZ).catch(() => null);
            await hedef.roles.add(secilenRol).catch(() => null);

            profilGereksinim(hedef.id);

            const basariliLogKanal = message.guild.channels.cache.get(KANALLAR.KAYIT_BAŞARILI_LOG);
            if (basariliLogKanal) {
                basariliLogKanal.send(`Kayıt edildi hoş geldiniz <@${hedef.id}>`);
            }

            await msg.edit({ content: `✅ ${hedef} kullanıcısının kaydı başarıyla tamamlandı!`, components: [] });
            collector.stop();
        });
    }

    // ------------------------------------------
    // 4. .ant & .pen GELİŞİM SİSTEMLERİ
    // ------------------------------------------
    if (command === 'ant') {
        profilGereksinim(message.author.id);
        const simdi = Date.now();
        const beklemeSüresi = data.oyuncular[message.author.id].antSüre + 3600000 - simdi;

        if (beklemeSüresi > 0) {
            const kalanDk = Math.floor(beklemeSüresi / 60000);
            return message.reply(`⏳ Kasların ağrıyor kanka! Dinlenmek için **${kalanDk} dakika** beklemelisin.`);
        }

        data.oyuncular[message.author.id].ant += 1;
        if (data.oyuncular[message.author.id].ant > 5) data.oyuncular[message.author.id].ant = 5;
        
        data.oyuncular[message.author.id].antSüre = simdi;
        saveDB();

        return message.reply(`🏋️ **Antrenman Tamamlandı!** Kondisyon durumunuz: **${data.oyuncular[message.author.id].ant}/5**`);
    }

    if (command === 'pen') {
        profilGereksinim(message.author.id);
        const simdi = Date.now();
        const beklemeSüresi = data.oyuncular[message.author.id].penSüre + 3600000 - simdi;

        if (beklemeSüresi > 0) {
            const kalanDk = Math.floor(beklemeSüresi / 60000);
            return message.reply(`⏳ Yeniden şut çalışmak için **${kalanDk} dakika** beklemelisin.`);
        }

        const ihtimaller = ['gol', 'direk', 'kurtaris'];
        const sonuc = ihtimaller[Math.floor(Math.random() * ihtimaller.length)];

        if (sonuc === 'gol') {
            data.oyuncular[message.author.id].gol += 1;
            message.reply("⚽ **GOOOL!** Topu filelerle buluşturdun!");
        } else if (sonuc === 'direk') {
            data.oyuncular[message.author.id].direk += 1;
            message.reply("💥 **DİREK!** Top sertçe direğe çarpıp dışarı kaçtı!");
        } else {
            data.oyuncular[message.author.id].kurtaris += 1;
            message.reply("🧤 **KURTARIŞ!** Kaleci köşeyi iyi kapattı ve topu çıkardı.");
        }

        data.oyuncular[message.author.id].penSüre = simdi;
        saveDB();
    }

    // ------------------------------------------
    // 5. PİYASA DEĞERİ SİSTEMİ & TAKMA AD GÜNCELLEME
    // ------------------------------------------
    if (command === 'degerekle' || command === 'degercikar') {
        if (!message.member.roles.cache.has(ROLLER.DEGER_YETKILISI)) {
            return message.reply("❌ Bu komutu sadece **Değer Yetkilileri** kullanabilir.");
        }

        const hedef = message.mentions.members.first();
        const miktarMetni = args[1];

        if (!hedef || !miktarMetni) {
            return message.reply(`❌ Yanlış Kullanım! Örnek: \`.${command} @kullanıcı 3m\``);
        }

        profilGereksinim(hedef.id);
        const miktar = parseDeger(miktarMetni);

        if (command === 'degerekle') {
            data.oyuncular[hedef.id].deger += miktar;
        } else {
            data.oyuncular[hedef.id].deger -= miktar;
            if (data.oyuncular[hedef.id].deger < 0) data.oyuncular[hedef.id].deger = 0;
        }
        saveDB();

        const yeniFormatliDeger = formatDeger(data.oyuncular[hedef.id].deger);

        // Dinamik Takma Ad Değiştirme (İsim | SNT | 🇩🇪 | Değer kısmını yakalar)
        let mevcutNick = hedef.displayName;
        let parcalar = mevcutNick.split('|');
        if (parcalar.length >= 2) {
            parcalar[parcalar.length - 1] = ` ${yeniFormatliDeger}`;
            let yeniNick = parcalar.join('|');
            await hedef.setNickname(yeniNick).catch(() => null);
        }

        message.reply(`📊 Değer başarıyla güncellendi! Yeni Değeri: **${yeniFormatliDeger}**`);

        const bildirimKanal = message.guild.channels.cache.get(KANALLAR.DEGER_LOG);
        if (bildirimKanal) {
            bildirimKanal.send(`📢 **Piyasa Değeri Güncellendi!**\n👤 **Oyuncu:** ${hedef}\n💰 **Yeni Piyasa Değeri:** \`${yeniFormatliDeger}\``);
        }
    }

    // ------------------------------------------
    // 6. PROFİL & TAKIM SİSTEMLERİ
    // ------------------------------------------
    if (command === 'profil') {
        const hedef = message.mentions.members.first() || message.member;
        profilGereksinim(hedef.id);

        const p = data.oyuncular[hedef.id];
        const profilEmbed = new EmbedBuilder()
            .setColor('#2E8B57')
            .setTitle(`⚽ Oyuncu Profil Kartı`)
            .setThumbnail(hedef.user.displayAvatarURL())
            .addFields(
                { name: '📋 Takma Ad', value: `${hedef.displayName}` },
                { name: '🏛️ Kulübü', value: `\`${p.takim}\``, inline: true },
                { name: '💰 Piyasa Değeri', value: `\`${formatDeger(p.deger)}\``, inline: true },
                { name: '🏋️ Antrenman', value: `\`${p.ant}/5\``, inline: true },
                { name: '⚽ Atılan Gol', value: `\`${p.gol}\``, inline: true },
                { name: '💥 Direk', value: `\`${p.direk}\``, inline: true },
                { name: '🧤 Kurtarış', value: `\`${p.kurtaris}\``, inline: true }
            );

        return message.reply({ embeds: [profilEmbed] });
    }

    if (command === 'takimkur') {
        if (!message.member.roles.cache.has(ROLLER.UST_YETKILI)) {
            return message.reply("❌ Bu komutu sadece **Üst Yetkililer** kullanabilir.");
        }

        const hedef = message.mentions.members.first();
        const takimAdi = args.slice(1).join(" ");

        if (!hedef || !takimAdi) return message.reply("❌ Kullanım: `.takimkur @kullanıcı Fenerbahçe` ");

        data.takimlar[takimAdi.toLowerCase()] = {
            isim: takimAdi,
            sahipId: hedef.id,
            oyuncular: []
        };
        saveDB();

        return message.reply(`✅ **${takimAdi}** kulübü başarıyla tescillendi! Sahibi: ${hedef}`);
    }

    if (command === 'takimsil') {
        if (!message.member.roles.cache.has(ROLLER.UST_YETKILI)) {
            return message.reply("❌ Bu komutu sadece **Üst Yetkililer** kullanabilir.");
        }

        const takimAdi = args.join(" ");
        if (!takimAdi) return message.reply("❌ Kullanım: `.takimsil Fenerbahçe` ");

        if (data.takimlar[takimAdi.toLowerCase()]) {
            delete data.takimlar[takimAdi.toLowerCase()];
            saveDB();
            return message.reply(`🗑️ **${takimAdi}** kulübü lig veri tabanından silindi.`);
        } else {
            return message.reply("❌ Takım bulunamadı.");
        }
    }

    if (command === 'takimliste') {
        const tList = Object.values(data.takimlar);
        if (tList.length === 0) return message.reply("❌ Ligde kurulmuş aktif bir takım bulunmuyor.");

        const liste = tList.map((t, index) => `${index + 1}. **${t.isim}** - Sahibi: <@${t.sahipId}>`).join('\n');
        return message.reply(`🏛️ **Efsane Lig Kulüpleri:**\n\n${liste}`);
    }

    // ------------------------------------------
    // 7. TRANSFER SİSTEMLERİ (.oyuncuekle / .oyuncucikar)
    // ------------------------------------------
    if (command === 'oyuncuekle' || command === 'oyuncucikar') {
        const isTD = message.member.roles.cache.has(ROLLER.TEKNIK_DIREKTOR);
        const isBaskan = message.member.roles.cache.has(ROLLER.BASKAN);

        if (!isTD && !isBaskan) {
            return message.reply("❌ Bu yetkiyi sadece **Başkanlar** veya **Teknik Direktörler** kullanabilir.");
        }

        const hedef = message.mentions.members.first();
        const takimAdi = args.slice(1).join(" ");

        if (!hedef || !takimAdi) {
            return message.reply(`❌ Kullanım: \`.${command} @oyuncu [Takım Adı]\``);
        }

        const kulüp = data.takimlar[takimAdi.toLowerCase()];
        if (!kulüp) return message.reply("❌ Ligde bu isimde bir takım kurulmamış!");

        profilGereksinim(hedef.id);

        if (command === 'oyuncuekle') {
            if (kulüp.oyuncular.includes(hedef.id)) return message.reply("❌ Bu oyuncu zaten kadroda.");
            
            kulüp.oyuncular.push(hedef.id);
            data.oyuncular[hedef.id].takim = kulüp.isim;
            message.reply(`✅ ${hedef} başarıyla **${kulüp.isim}** kadrosuna transfer oldu!`);
        } else {
            if (!kulüp.oyuncular.includes(hedef.id)) return message.reply("❌ Oyuncu takım kadrosunda yok.");
            
            kulüp.oyuncular = kulüp.oyuncular.filter(id => id !== hedef.id);
            data.oyuncular[hedef.id].takim = "Yok";
            message.reply(`💨 ${hedef} takım kadrosundan çıkarıldı.`);
        }
        saveDB();
    }

    // ------------------------------------------
    // 8. .kadro DETAYLI LISTELEME
    // ------------------------------------------
    if (command === 'kadro') {
        const takimAdi = args.join(" ");
        if (!takimAdi) return message.reply("❌ Kullanım: `.kadro Fenerbahçe` ");

        const kulüp = data.takimlar[takimAdi.toLowerCase()];
        if (!kulüp) return message.reply("❌ Takım bulunamadı.");

        let toplamKadroDegeri = 0;
        let oyuncuMetni = "";

        if (kulüp.oyuncular.length === 0) {
            oyuncuMetni = "_Kadroda kayıtlı oyuncu bulunmuyor._";
        } else {
            kulüp.oyuncular.forEach((id, index) => {
                profilGereksinim(id);
                const p = data.oyuncular[id];
                toplamKadroDegeri += p.deger;
                oyuncuMetni += `${index + 1}. <@${id}> - Değeri: \`${formatDeger(p.deger)}\`\n`;
            });
        }

        const kadroEmbed = new EmbedBuilder()
            .setColor('#4682B4')
            .setTitle(`🏛️ ${kulüp.isim} Kadro Bilgisi`)
            .setDescription(oyuncuMetni)
            .addFields({ name: '📊 Toplam Kadro Değeri', value: `\`${formatDeger(toplamKadroDegeri)}\`` })
            .setTimestamp();

        return message.reply({ embeds: [kadroEmbed] });
    }
});

client.login(process.env.TOKEN);
    
