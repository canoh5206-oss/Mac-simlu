const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ComponentType
} = require('discord.js');
const fs = require('fs');
const moment = require('moment'); // Zaman hesaplamaları için
require('moment/locale/tr'); 
moment.locale('tr');

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
            ant: 0, gol: 0, direk: 0, kurtaris: 0, deger: 0, takim: "Yok", antSüre: 0, penSüre: 0, kayitGecmisi: []
        };
        saveDB();
    }
}

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

function profilEmbedOlustur(member) {
    profilGereksinim(member.id);
    const p = data.oyuncular[member.id];
    return new EmbedBuilder()
        .setColor('#2E8B57')
        .setTitle(`⚽ Oyuncu Profil Kartı`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: '📋 Takma Ad', value: `${member.displayName}` },
            { name: '🏛️ Kulübü', value: `\`${p.takim}\``, inline: true },
            { name: '💰 Piyasa Değeri', value: `\`${formatDeger(p.deger)}\``, inline: true },
            { name: '🏋️ Antrenman', value: `\`${p.ant}/5\``, inline: true },
            { name: '⚽ Atılan Gol', value: `\`${p.gol}\``, inline: true },
            { name: '💥 Direk', value: `\`${p.direk}\``, inline: true },
            { name: '🧤 Kurtarış', value: `\`${p.kurtaris}\``, inline: true }
        )
        .setTimestamp();
}

// ==========================================
// SUNUCUYA BİRİ GİRDİĞİNDE
// ==========================================
client.on('guildMemberAdd', async (member) => {
    await member.roles.add(ROLLER.KAYIZSIZ).catch(() => null);
    
    const üyeSayisi = member.guild.memberCount;
    const logKanal = member.guild.channels.cache.get(KANALLAR.HOZ_GELDIN_LOG);
    
    if (logKanal) {
        const guvenlik = (Date.now() - member.user.createdTimestamp) < 7 * 24 * 60 * 60 * 1000 ? "⚠️ Şüpheli / Tehlikeli" : "✅ Güvenilir";
        const hesapOlusturma = moment(member.user.createdAt).format('dddd, D MMMM YYYY HH:mm');
        const hesapYasi = moment.duration(Date.now() - member.user.createdTimestamp).humanize() + " önce";

        const hgEmbed = new EmbedBuilder()
            .setColor('#2f3136')
            .setAuthor({ name: `Yeni Üye - Kayıt Sistemi`, iconURL: member.guild.iconURL() })
            .setTitle(`👤 ${member.user.username} — @...`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setDescription(
                `👤 **Kullanıcı:** ${member} (${member.id})\n` +
                `🏆 **Sunucu Sırası:** #${üyeSayisi}\n` +
                `💾 **Toplam Üye:** ${üyeSayisi}\n\n` +
                `🛡️ **Güvenlik:** ${guvenlik}\n` +
                `🌱 **Hesap Yaşı:** ${hesapYasi}\n` +
                `🌐 **Hesap Oluşum:** ${hesapOlusturma}\n` +
                `📌 **Katılma:** ${moment(member.joinedAt).format('dddd, D MMMM YYYY HH:mm')}\n\n` +
                `🤖 **Bot mu?:** ${member.user.bot ? "Evet 🤖" : "Hayır 👤"}\n` +
                `💬 **Kullanıcı Adı:** ${member.user.username}\n` +
                `📁 **ID:** ${member.id}`
            )
            .setFooter({ text: `Lütfen hoş geldin deyin ve kayıt edin!` })
            .setTimestamp();

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`btn_uye_${member.id}`).setLabel('Uye').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`btn_futbolcu_${member.id}`).setLabel('Futbolcu').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`btn_td_${member.id}`).setLabel('Teknik Direktor').setStyle(ButtonStyle.Primary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`btn_baskan_${member.id}`).setLabel('Baskan').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`btn_gecmis_${member.id}`).setLabel('Kayıt Geçmişi').setStyle(ButtonStyle.Secondary)
        );

        logKanal.send({ 
            content: `<@&${ROLLER.KAYIT_YETKILISI}>`, 
            embeds: [hgEmbed],
            components: [row1, row2]
        });
    }
});

// ==========================================
// INTERACTION (BUTON) DİNLEYİCİSİ
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const [prefix, secim, hedefId] = interaction.customId.split('_');
    if (prefix !== 'btn') return;

    if (!interaction.member.roles.cache.has(ROLLER.KAYIT_YETKILISI)) {
        return interaction.reply({ content: "❌ Bu butonları sadece **Kayıt Yetkilileri** kullanabilir.", ephemeral: true });
    }

    if (secim === 'gecmis') {
        profilGereksinim(hedefId);
        const gecmis = data.oyuncular[hedefId]?.kayitGecmisi || [];
        if (gecmis.length === 0) return interaction.reply({ content: `📝 <@${hedefId}> kullanıcısının geçmiş kayıt verisi bulunamadı.`, ephemeral: true });
        return interaction.reply({ content: `📋 **Kayıt Geçmişi:**\n${gecmis.join('\n')}`, ephemeral: true });
    }

    let ornekIsim = "İsim | SNT | 🇩🇪 | 0";
    if (secim === 'td') ornekIsim = "İsim | TD | 🇹🇷";
    if (secim === 'baskan') ornekIsim = "İsim | Başkan | 👑";

    return interaction.reply({
        content: `📝 Lütfen aşağıdaki hazır komutu kopyalayıp **sohbet kanalına** yapıştırın, ismi düzenleyip gönderin:\n\n\`\`\`.k <@${hedefId}> ${ornekIsim}\`\`\``,
        ephemeral: true
    });
});

// ==========================================
// MESAJ KOMUTLARI
// ==========================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // .yardim
    if (command === 'yardim') {
        const yardimEmbed = new EmbedBuilder()
            .setColor('#2F3136')
            .setTitle('🏆 Efsane Lig RP - Komut Menüsü')
            .addFields(
                { name: '📝 Kayıt Komutları', value: '`.k @kullanıcı [İsim]` - Butonlu kayıt panelini tetikler.' },
                { name: '🏋️ Gelişim Sistemi', value: '`.ant` - Saatte bir antrenman kasıp profilinizi gösterir.\n`.pen` - Saatte bir penaltı idmanı yapar.' },
                { name: '📊 Değer Komutları', value: '`.degerekle @kullanıcı [Miktar]` - Değer ekler.\n`.degercikar @kullanıcı [Miktar]` - Değer düşer.' },
                { name: '🏛️ Kulüp Yönetimi', value: '`.takimkur @yönetici [Takım]` | `.takimsil [Takım]` | `.takimliste`' },
                { name: '📋 Transfer & Kadro', value: '`.oyuncuekle` | `.oyuncucikar` | `.kadro [Takım]`' },
                { name: '👤 Profil Bilgisi', value: '`.profil [@kullanıcı]` - Oyuncu kartını gösterir.' }
            ).setTimestamp();
        return message.reply({ embeds: [yardimEmbed] });
    }

    // .k
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
            content: `📝 ${hedef} kullanıcısı için kaydı tamamlayacak son rolü seçiniz:`,
            components: [row]
        });

        const filter = i => i.user.id === message.author.id;
        const collector = msg.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 30000 });

        collector.on('collect', async i => {
            await i.deferUpdate();
            let secilenRol = i.customId === 'kayit_futbolcu' ? ROLLER.FUTBOLCU : (i.customId === 'kayit_td' ? ROLLER.TEKNIK_DIREKTOR : ROLLER.BASKAN);
            let rolIsim = i.customId === 'kayit_futbolcu' ? 'Futbolcu' : (i.customId === 'kayit_td' ? 'Teknik Direktör' : 'Başkan');

            await hedef.setNickname(yeniIsim).catch(() => null);
            await hedef.roles.remove(ROLLER.KAYITSIZ).catch(() => null);
            await hedef.roles.add(secilenRol).catch(() => null);

            profilGereksinim(hedef.id);
            if (!data.oyuncular[hedef.id].kayitGecmisi) data.oyuncular[hedef.id].kayitGecmisi = [];
            data.oyuncular[hedef.id].kayitGecmisi.push(`✍️ Yetkili: ${message.author.tag} - Rol: ${rolIsim} - Tarih: ${moment().format('LTS')}`);
            saveDB();

            const üyeSayisi = message.guild.memberCount;
            const basariliLogKanal = message.guild.channels.cache.get(KANALLAR.KAYIT_BAŞARILI_LOG);
            
            if (basariliLogKanal) {
                const onayEmbed = profilEmbedOlustur(hedef);
                onayEmbed.setDescription(`🎉 **Kayıt başarıyla tamamlandı!**\n\n👤 **Kişi Sayısı:** Sunucumuz şu an **${üyeSayisi}** kişi.`);
                basariliLogKanal.send({ content: `Kayıt edildi hoş geldiniz <@${hedef.id}>`, embeds: [onayEmbed] });
            }

            await msg.edit({ content: `✅ ${hedef} kullanıcısının kaydı başarıyla tamamlandı ve profili oluşturuldu!`, components: [] });
            collector.stop();
        });
    }

    // .ant
    if (command === 'ant') {
        profilGereksinim(message.author.id);
        const simdi = Date.now();
        const beklemeSüresi = data.oyuncular[message.author.id].antSüre + 3600000 - simdi;

        if (beklemeSüresi > 0) {
            const kalanDk = Math.floor(beklemeSüresi / 60000);
            return message.reply(`⏳ Dinlenmek için **${kalanDk} dakika** beklemelisin.`);
        }

        data.oyuncular[message.author.id].ant += 1;
        if (data.oyuncular[message.author.id].ant > 5) data.oyuncular[message.author.id].ant = 5;
        
        data.oyuncular[message.author.id].antSüre = simdi;
        saveDB();

        const pEmbed = profilEmbedOlustur(message.member);
        return message.reply({ content: `🏋️ **Antrenman Yapıldı! Güncel Profiliniz:**`, embeds: [pEmbed] });
    }

    // .pen
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

        let bildirimMesaji = "";
        if (sonuc === 'gol') { data.oyuncular[message.author.id].gol += 1; bildirimMesaji = "⚽ **GOOOL!** Topu filelerle buluşturdun!"; }
        else if (sonuc === 'direk') { data.oyuncular[message.author.id].direk += 1; bildirimMesaji = "💥 **DİREK!** Top sertçe direğe çarptı!"; }
        else { data.oyuncular[message.author.id].kurtaris += 1; bildirimMesaji = "🧤 **KURTARIŞ!** Kaleci köşeyi iyi kapattı."; }

        data.oyuncular[message.author.id].penSüre = simdi;
        saveDB();

        const pEmbed = profilEmbedOlustur(message.member);
        return message.reply({ content: `${bildirimMesaji}\n\n🔄 **Güncel Profiliniz:**`, embeds: [pEmbed] });
    }

    // .degerekle & .degercikar
    if (command === 'degerekle' || command === 'degercikar') {
        if (!message.member.roles.cache.has(ROLLER.DEGER_YETKILISI)) return message.reply("❌ Yetkin yok!");
        const hedef = message.mentions.members.first();
        const miktarMetni = args[1];

        if (!hedef || !miktarMetni) return message.reply(`❌ Örnek: \`.${command} @kullanıcı 3m\``);

        profilGereksinim(hedef.id);
        const miktar = parseDeger(miktarMetni);

        if (command === 'degerekle') data.oyuncular[hedef.id].deger += miktar;
        else { data.oyuncular[hedef.id].deger -= miktar; if (data.oyuncular[hedef.id].deger < 0) data.oyuncular[hedef.id].deger = 0; }
        saveDB();

        const yeniFormatliDeger = formatDeger(data.oyuncular[hedef.id].deger);

        let mevcutNick = hedef.displayName;
        let parcalar = mevcutNick.split('|');
        if (parcalar.length >= 2) {
            parcalar[parcalar.length - 1] = ` ${yeniFormatliDeger}`;
            let yeniNick = parcalar.join('|');
            await hedef.setNickname(yeniNick).catch(() => null);
        }

        message.reply(`📊 Değer güncellendi! Yeni Değeri: **${yeniFormatliDeger}**`);

        const bildirimKanal = message.guild.channels.cache.get(KANALLAR.DEGER_LOG);
        if (bildirimKanal) {
            bildirimKanal.send(`📢 **Piyasa Değeri Güncellendi!**\n👤 **Oyuncu:** ${hedef}\n💰 **Yeni Piyasa Değeri:** \`${yeniFormatliDeger}\``);
        }
    }

    // .profil
    if (command === 'profil') {
        const hedef = message.mentions.members.first() || message.member;
        const pEmbed = profilEmbedOlustur(hedef);
        return message.reply({ embeds: [pEmbed] });
    }

    // .takimkur
    if (command === 'takimkur') {
        if (!message.member.roles.cache.has(ROLLER.UST_YETKILI)) return message.reply("❌ Yetkin yok!");
        const hedef = message.mentions.members.first();
        const takimAdi = args.slice(1).join(" ");
        if (!hedef || !takimAdi) return message.reply("❌ Kullanım: `.takimkur @kullanıcı Fenerbahçe` ");
        data.takimlar[takimAdi.toLowerCase()] = { isim: takimAdi, sahipId: hedef.id, oyuncular: [] };
        saveDB();
        return message.reply(`✅ **${takimAdi}** kulübü kuruldu! Sahibi: ${hedef}`);
    }

    // .takimsil
    if (command === 'takimsil') {
        if (!message.member.roles.cache.has(ROLLER.UST_YETKILI)) return message.reply("❌ Yetkin yok!");
        const takimAdi = args.join(" ");
        if (data.takimlar[takimAdi.toLowerCase()]) { delete data.takimlar[takimAdi.toLowerCase()]; saveDB(); return message.reply(`🗑️ Takım silindi.`); }
        return message.reply("❌ Takım bulunamadı.");
    }

    // .takimliste
    if (command === 'takimliste') {
        const tList = Object.values(data.takimlar);
        if (tList.length === 0) return message.reply("❌ Ligde takım bulunmuyor.");
        const liste = tList.map((t, index) => `${index + 1}. **${t.isim}** - Sahibi: <@${t.sahipId}>`).join('\n');
        return message.reply(`🏛️ **Efsane Lig Kulüpleri:**\n\n${liste}`);
    }

    // .oyuncuekle & .oyuncucikar
    if (command === 'oyuncuekle' || command === 'oyuncucikar') {
        if (!message.member.roles.cache.has(ROLLER.TEKNIK_DIREKTOR) && !message.member.roles.cache.has(ROLLER.BASKAN)) return message.reply("❌ Kulüp yetkiniz yok!");
        const hedef = message.mentions.members.first();
        const takimAdi = args.slice(1).join(" ");
        const kulüp = data.takimlar[takimAdi?.toLowerCase()];

        if (!hedef || !kulüp) return message.reply(`❌ Kullanım: \`.${command} @oyuncu [Takım Adı]\``);
        profilGereksinim(hedef.id);

        if (command === 'oyuncuekle') {
            if (kulüp.oyuncular.includes(hedef.id)) return message.reply("❌ Oyuncu zaten kadroda.");
            kulüp.oyuncular.push(hedef.id);
            data.oyuncular[hedef.id].takim = kulüp.isim;
            message.reply(`✅ Oyuncu **${kulüp.isim}** kadrosuna eklendi.`);
        } else {
            kulüp.oyuncular = kulüp.oyuncular.filter(id => id !== hedef.id);
            data.oyuncular[hedef.id].takim = "Yok";
            message.reply(`💨 Oyuncu kadrodan çıkarıldı.`);
        }
        saveDB();
    }

    // .kadro
    if (command === 'kadro') {
        const takimAdi = args.join(" ");
        const kulüp = data.takimlar[takimAdi?.toLowerCase()];
        if (!kulüp) return message.reply("❌ Takım bulunamadı.");

        let toplamKadroDegeri = 0; let oyuncuMetni = "";
        kulüp.oyuncular.forEach((id, index) => {
            profilGereksinim(id);
            toplamKadroDegeri += data.oyuncular[id].deger;
            oyuncuMetni += `${index + 1}. <@${id}> - Değeri: \`${formatDeger(data.oyuncular[id].deger)}\`\n`;
        });

        const kadroEmbed = new EmbedBuilder()
            .setColor('#4682B4')
            .setTitle(`🏛️ ${kulüp.isim} Kadro Bilgisi`)
            .setDescription(oyuncuMetni || '_Kadro boş_')
            .addFields({ name: '📊 Toplam Kadro Değeri', value: `\`${formatDeger(toplamKadroDegeri)}\`` });
        return message.reply({ embeds: [kadroEmbed] });
    }
});

client.once('ready', () => {
    console.log(`[BOT] ${client.user.tag} başarıyla aktif edildi!`);
});

client.login(process.env.TOKEN);
    
  
