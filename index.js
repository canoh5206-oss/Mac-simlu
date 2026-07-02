
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
const moment = require('moment'); // Zaman hesaplamaları için (Eğer yüklü değilse: npm i moment)
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
// SUNUCUYA BİRİ GİRDİĞİNDE (SS'TEKİ SİSTEM)
// ==========================================
client.on('guildMemberAdd', async (member) => {
    await member.roles.add(ROLLER.KAYITSIZ).catch(() => null);
    
    const üyeSayisi = member.guild.memberCount;
    const logKanal = member.guild.channels.cache.get(KANALLAR.HOZ_GELDIN_LOG);
    
    if (logKanal) {
        // Hesap Güvenlik Kontrolü (7 günden taze ise Tehlikeli)
        const guvenlik = (Date.now() - member.user.createdTimestamp) < 7 * 24 * 60 * 60 * 1000 ? "⚠️ Şüpheli / Tehlikeli" : "✅ Güvenilir";
        
        // Zaman formatlamaları
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

        // Buton Satırları (SS'teki Düzen)
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

    // Yetki Kontrolü
    if (!interaction.member.roles.cache.has(ROLLER.KAYIT_YETKILISI)) {
        return interaction.reply({ content: "❌ Bu butonları sadece **Kayıt Yetkilileri** kullanabilir.", ephemeral: true });
    }

    const hedefUye = await interaction.guild.members.fetch(hedefId).catch(() => null);
    if (!hedefUye && secim !== 'gecmis') {
        return interaction.reply({ content: "❌ Kullanıcı sunucudan ayrılmış.", ephemeral: true });
    }

    // Kayıt Geçmişi Butonu basıldıysa
    if (secim === 'gecmis') {
        profilGereksinim(hedefId);
        const gecmis = data.oyuncular[hedefId]?.kayitGecmisi || [];
        if (gecmis.length === 0) return interaction.reply({ content: `📝 <@${hedefId}> kullanıcısının geçmiş kayıt verisi bulunamadı.`, ephemeral: true });
        return interaction.reply({ content: `📋 **Kayıt Geçmişi:**\n${gecmis.join('\n')}`, ephemeral: true });
    }

    // Doğrudan Kayıt Butonlarından Biri Basıldıysa Yetkiliye İsim Giriş Komutunu Hatırlatıyoruz
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

    // .k Komutu (Butondan sonra ismi girmek için kullanılan komut)
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

            // Veritabanı ve Geçmiş Kayıt Güncellemesi
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

    // .profil komutu
    if (command === 'profil') {
        const hedef = message.mentions.members.first() || message.member;
        const pEmbed = profilEmbedOlustur(hedef);
        return message.reply({ embeds: [pEmbed] });
    }
});

client.once('ready', () => {
    console.log(`[BOT] ${client.user.tag} başarıyla aktif edildi!`);
});

client.login(process.env.TOKEN);
