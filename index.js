const { Client, GatewayIntentBits, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ]
});

// ==========================================
// SABİT CONFIG VE ID AYARLARI
// ==========================================
const KAYIT_YETKILI_ROLLER = ['1520768910947782687']; 
const TAKIM_YETKILI_ROLLER = ['1519414839561158828']; 
const OYUNCU_YETKILI_ROLLER = ['1520770167720771644', '1520770097558585344'];
const DEGER_YETKILI_ROL = '1520768962193915945'; 

const KAYIT_ODASI_ID = '1520767182563311737'; 
const KAYIT_DUYURU_KANAL_ID = '1520767204746858567'; 
const DEGER_BILDIRI_KANAL_ID = '1520767223646519328'; 

const ROL_FUTBOLCU = '1520770217041727598';
const ROL_TD = '1520770167720771644';
const ROL_BASKAN = '1520770097558585344';

// Hafıza Veritabanları
let oyuncuVerileri = {}; 
let antrenmanCooldown = new Map(); 
let penaltiCooldown = new Map();   

const KUFUR_LISTESI = ['amk', 'aq', 'orospu', 'piç', 'sik', 'göt', 'yarrak', '31', 'oe', 'oropusu'];

// 🎯 K, M, B KISALTMALARI SAYIYA ÇEVİREN FONKSİYON
function miktarCoz(metin) {
    if (!metin) return NaN;
    let temizMetin = metin.toLowerCase().trim().replace(/,/g, '').replace('€', '').replace('₺', '');
    let carpan = 1;

    if (temizMetin.endsWith('k')) {
        carpan = 1000;
        temizMetin = temizMetin.slice(0, -1);
    } else if (temizMetin.endsWith('m')) {
        carpan = 1000000;
        temizMetin = temizMetin.slice(0, -1);
    } else if (temizMetin.endsWith('b')) {
        carpan = 1000000000;
        temizMetin = temizMetin.slice(0, -1);
    }

    let sayi = parseFloat(temizMetin);
    if (isNaN(sayi)) return NaN;
    return Math.floor(sayi * carpan);
}

// SAYIYI TEKRAR HARFLİ FORMATA ÇEVİREN FONKSİYON
function miktarFormatla(sayi) {
    if (sayi >= 1000000000) return (sayi / 1000000000).toFixed(0) + 'B'; 
    if (sayi >= 1000000) return (sayi / 1000000).toFixed(0) + 'M';
    if (sayi >= 1000) return (sayi / 1000).toFixed(0) + 'K';
    return sayi.toString();
}

function veriGarantiEt(id) {
    if (!oyuncuVerileri[id]) {
        oyuncuVerileri[id] = { ant: 0, bakiye: 0, banka: 0, gol: 0, kacan: 0 };
    }
    if (oyuncuVerileri[id].bakiye === undefined) oyuncuVerileri[id].bakiye = 0;
    if (oyuncuVerileri[id].banka === undefined) oyuncuVerileri[id].banka = 0;
    if (oyuncuVerileri[id].ant === undefined) oyuncuVerileri[id].ant = 0;
    if (oyuncuVerileri[id].gol === undefined) oyuncuVerileri[id].gol = 0;
    if (oyuncuVerileri[id].kacan === undefined) oyuncuVerileri[id].kacan = 0;
}

// COOLDOWN SÜRESİNİ SAAT/DAKİKA/SANİYE FORMATINA ÇEVİREN FONKSİYON
function beklemeSüresiHesapla(kalanMs) {
    const saat = Math.floor(kalanMs / 3600000);
    const dakika = Math.floor((kalanMs % 3600000) / 60000);
    const saniye = Math.floor((kalanMs % 60000) / 1000);

    let sonuc = "";
    if (saat > 0) sonuc += `${saat} saat `;
    if (dakika > 0) sonuc += `${dakika} dakika `;
    if (saniye > 0) sonuc += `${saniye} saniye`;
    return sonuc.trim();
}

// 🎯 OTOMATİK İSİM VE DEĞER MOTORU
async function degerIsle(member, miktar, islemTipi) {
    let eskiIsim = member.displayName;
    let parcalar = eskiIsim.split('|').map(p => p.trim());
    
    let sonDegerMetni = parcalar[parcalar.length - 1];
    let mevcutDeger = miktarCoz(sonDegerMetni);
    
    if (isNaN(mevcutDeger)) mevcutDeger = 0; 
    
    let yeniDeger = (islemTipi === 'artir') ? (mevcutDeger + miktar) : (mevcutDeger - miktar);
    if (yeniDeger < 0) yeniDeger = 0;

    let yeniDegerMetni = miktarFormatla(yeniDeger);

    parcalar[parcalar.length - 1] = yeniDegerMetni;
    let yeniIsim = parcalar.join(' | ');

    await member.setNickname(yeniIsim).catch(() => {});
    return { yeniIsim, eskiDeger: miktarFormatla(mevcutDeger), yeniDeger: yeniDegerMetni };
}

client.once('ready', () => {
    console.log(`⚽ Nors Bot Tüm Sistemleriyle Hazır Kanka!`);
});

process.on('unhandledRejection', (reason) => { console.error("🔴 Hata:", reason); });
process.on('uncaughtException', (err) => { console.error("🔴 Kritik Hata:", err); });

// ==========================================
// GÜVENLİKLİ GİRİŞ SİSTEMİ
// ==========================================
client.on('guildMemberAdd', async (member) => {
    try {
        const kayitKanali = member.guild.channels.cache.get(KAYIT_ODASI_ID);
        if (!kayitKanali) return;

        const uyeSayisi = member.guild.memberCount;
        const olusturmaTarihi = member.user.createdAt;
        const hesapYasiGun = Math.floor((new Date() - olusturmaTarihi) / (1000 * 60 * 60 * 24));
        const guvenlikDurumu = hesapYasiGun >= 30 ? '🔹 Güvenilir!' : '⚠️ Güvenilir Değil (Şüpheli)!';

        const girisEmbed = new EmbedBuilder()
            .setAuthor({ name: `Yeni Bir Kullanıcı Katıldı, 👋\n${member.user.username}!`, iconURL: member.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL() })
            .setDescription(`👋 **Sunucumuza hoş geldin** <@${member.id}>\n\n🔹 **Seninle birlikte ${uyeSayisi} kişiyiz.**\n\n\n☀️ **Hesap oluşturulma tarihi:** ${olusturmaTarihi.toLocaleDateString('tr-TR')}  ${olusturmaTarihi.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}\n🦹‍♀️ **Güvenilirlik durumu:**\n☑️ **${guvenlikDurumu}**`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }) || client.user.displayAvatarURL())
            .setColor(0x1F2225)
            .setFooter({ text: 'Nors', iconURL: client.user.displayAvatarURL() });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`btn_kayit_baslat_${member.id}`).setLabel('🪪 Normal Kayıt').setStyle(ButtonStyle.Primary)
        );

        await kayitKanali.send({ content: `📢 <@&1520768910947782687>, <@${member.id}> sunucuya giriş yaptı.`, embeds: [girisEmbed], components: [row] });
    } catch (e) { console.error(e); }
});

// ==========================================
// MESAJ MERKEZİ (KOMUTLAR)
// ==========================================
client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot || !message.guild) return;

        const icerik = message.content.trim();
        const icerikKucuk = icerik.toLowerCase();
        const argumanlar = icerik.split(/\s+/);

        // --- KÜFÜR KORUMASI ---
        const kufurVarMi = KUFUR_LISTESI.some(kufur => new RegExp(`\\b${kufur}\\b`, 'i').test(icerikKucuk));
        if (kufurVarMi && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await message.delete().catch(() => {});
            await message.member.timeout(2 * 60 * 1000, 'Küfür kullanımı.').catch(() => {});
            return message.channel.send(`⚠️ <@${message.author.id}> küfür ettiği için **2 dakika** susturuldu kanka.`).catch(() => {});
        }

        // --- .yardim KOMUTU ---
        if (icerikKucuk === '.yardim') {
            const yardimEmbed = new EmbedBuilder()
                .setTitle('📋 Nors Bot Komut Listesi')
                .setColor(0x2F3136)
                .setThumbnail(client.user.displayAvatarURL())
                .setDescription(
                    `⚽ **Oyuncu Komutları:**\n` +
                    `• \`.ant\` - Antrenman yaparsınız (1 saat cooldown).\n` +
                    `• \`.pen\` - Penaltı atarsınız (1 saat cooldown).\n` +
                    `• \`.istatistik\` - Gol ve kaçan penaltı istatistiklerinizi gösterir.\n\n` +
                    `💰 **Ekonomi Komutları (k, m, b geçerli):**\n` +
                    `• \`.bakiye\` veya \`.bal\` - Cüzdan bilgilerinizi gösterir.\n` +
                    `• \`.send @üye [Miktar]\` - Oyuncuya para transfer eder.\n` +
                    `• \`.paraver @üye [Miktar]\` - Yetkili oyuncuya para ekler.\n` +
                    `• \`.paracikar @üye [Miktar]\` - Yetkili oyuncudan para siler.\n\n` +
                    `📈 **Değer Yönetim Komutları (k, m, b geçerli):**\n` +
                    `• \`.degerver @üye [Miktar]\` - Oyuncunun ismindeki değeri artırır.\n` +
                    `• \`.degercikar @üye [Miktar]\` - Oyuncunun ismindeki değeri düşürür.\n\n` +
                    `📥 **Kayıt Komutları:**\n` +
                    `• \`-k @üye İstediğin İsim Formatı\` - Serbest kayıt yapar.`
                )
                .setFooter({ text: 'Nors Lig Yönetim Sistemi' });
            return message.reply({ embeds: [yardimEmbed] });
        }

        // --- -k SERBEST KAYIT (DÜZELTİLDİ - TAMAMEN ÖZGÜR İSİM) ---
        if (icerikKucuk.startsWith('-k') || icerikKucuk.startsWith('-kayit')) {
            if (message.channel.id !== KAYIT_ODASI_ID) return;
            if (!message.member.roles.cache.some(r => KAYIT_YETKILI_ROLLER.includes(r.id))) return message.reply('❌ Kayıt yetkilisi rolün yok kanka.');

            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ Üyeyi etiketle kanka! Örn: `-k @üye İstediğin İsim Formatı`');

            // Etiketten sonra yazılan tüm metni tamamen alıp serbest bırakıyoruz
            const metinKismi = icerik.substring(icerik.indexOf('>') + 1).trim();
            if (!metinKismi) return message.reply('❌ Lütfen üye için bir isim düzeni gir kanka!');

            await hedefUye.setNickname(metinKismi).catch(() => {});

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`k_futbolcu_${hedefUye.id}`).setLabel('⚽ Futbolcu').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`k_td_${hedefUye.id}`).setLabel('📋 Teknik Direktör').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`k_baskan_${hedefUye.id}`).setLabel('👑 Takım Başkanı').setStyle(ButtonStyle.Success)
            );

            return message.reply({ content: `📝 <@${hedefUye.id}> ismi **${metinKismi}** olarak ayarlandı. Rol seç kanka:`, components: [row] });
        }

        // ==========================================
        // DİNAMİK DEĞER SİSTEMİ KOMUTLARI
        // ==========================================
        if (icerikKucuk.startsWith('.degerver')) {
            if (!message.member.roles.cache.has(DEGER_YETKILI_ROL)) return message.reply('❌ Değer yetkilisi rolün yok kanka.');

            const hedefUye = message.mentions.members.first();
            const miktarStr = argumanlar[2];
            const miktar = miktarCoz(miktarStr);

            if (!hedefUye || isNaN(miktar)) return message.reply('❌ Yanlış kullanım. Örn: `.degerver @üye 5m`');

            const sonuc = await degerIsle(hedefUye, miktar, 'artir');
            message.reply(`✅ <@${hedefUye.id}> oyuncusunun değeri artırıldı!\n Yeni İsmi: \`${sonuc.yeniIsim}\``);

            const bildiriKanali = message.guild.channels.cache.get(DEGER_BILDIRI_KANAL_ID);
            if (bildiriKanali) {
                const bEmbed = new EmbedBuilder()
                    .setAuthor({ name: 'Değer Güncellemesi!', iconURL: message.guild.iconURL({ dynamic: true }) })
                    .setDescription(`📈 <@${hedefUye.id}> oyuncusunun değeri **${sonuc.eskiDeger}** seviyesinden **${sonuc.yeniDeger}** seviyesine yükseltildi!\n\n**Yetkili:** <@${message.author.id}>`)
                    .setColor(0x00FF00)
                    .setTimestamp();
                bildiriKanali.send({ embeds: [bEmbed] }).catch(() => {});
            }
            return;
        }

        if (icerikKucuk.startsWith('.degercikar')) {
            if (!message.member.roles.cache.has(DEGER_YETKILI_ROL)) return message.reply('❌ Değer yetkilisi rolün yok kanka.');

            const hedefUye = message.mentions.members.first();
            const miktarStr = argumanlar[2];
            const miktar = miktarCoz(miktarStr);

            if (!hedefUye || isNaN(miktar)) return message.reply('❌ Yanlış kullanım. Örn: `.degercikar @üye 5m`');

            const sonuc = await degerIsle(hedefUye, miktar, 'azalt');
            message.reply(`📉 <@${hedefUye.id}> oyuncusunun değeri düşürüldü!\n Yeni İsmi: \`${sonuc.yeniIsim}\``);

            const bildiriKanali = message.guild.channels.cache.get(DEGER_BILDIRI_KANAL_ID);
            if (bildiriKanali) {
                const bEmbed = new EmbedBuilder()
                    .setAuthor({ name: 'Değer Güncellemesi!', iconURL: message.guild.iconURL({ dynamic: true }) })
                    .setDescription(`📉 <@${hedefUye.id}> oyuncusunun değeri **${sonuc.eskiDeger}** seviyesinden **${sonuc.yeniDeger}** seviyesine düşürüldü.\n\n**Yetkili:** <@${message.author.id}>`)
                    .setColor(0xFF0000)
                    .setTimestamp();
                bildiriKanali.send({ embeds: [bEmbed] }).catch(() => {});
            }
            return;
        }

        // ==========================================
        // EKONOMİ SİSTEMİ KOMUTLARI
        // ==========================================
        if (icerikKucuk.startsWith('.bakiye') || icerikKucuk.startsWith('.bal')) {
            const hedefUye = message.mentions.members.first() || message.member;
            veriGarantiEt(hedefUye.id);

            const nakit = oyuncuVerileri[hedefUye.id].bakiye;
            const banka = oyuncuVerileri[hedefUye.id].banka;
            const toplam = nakit + banka;

            const bakiyeEmbed = new EmbedBuilder()
                .setAuthor({ name: `${hedefUye.user.username}'ın Cüzdanı`, iconURL: hedefUye.user.displayAvatarURL({ dynamic: true }) })
                .setTitle('💰 Bakiye Bilgileri')
                .setThumbnail(hedefUye.user.displayAvatarURL({ dynamic: true }))
                .setColor(0xFFAA00) 
                .setDescription(`💵 **Para**\n${nakit.toLocaleString('tr-TR')}€\n\n🏦 **Banka**\n${banka.toLocaleString('tr-TR')}€\n\n💎 **Toplam Servet**\n${toplam.toLocaleString('tr-TR')}€`)
                .setFooter({ text: 'Son güncelleme • Nors Ekonomi' });

            return message.reply({ embeds: [bakiyeEmbed] });
        }

        if (icerikKucuk.startsWith('.paraver')) {
            if (!message.member.roles.cache.some(r => TAKIM_YETKILI_ROLLER.includes(r.id))) return message.reply('❌ Ekonomi yetkin yok kanka.');
            const hedefUye = message.mentions.members.first();
            const miktar = miktarCoz(argumanlar[2]);

            if (!hedefUye || isNaN(miktar) || miktar <= 0) return message.reply('❌ Örn: `.paraver @üye 100k`');

            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[hedefUye.id].bakiye += miktar;
            return message.reply(`💰 <@${hedefUye.id}> cüzdanına **${miktar.toLocaleString('tr-TR')} €** eklendi kanka.`);
        }

        if (icerikKucuk.startsWith('.paracikar')) {
            if (!message.member.roles.cache.some(r => TAKIM_YETKILI_ROLLER.includes(r.id))) return message.reply('❌ Ekonomi yetkin yok kanka.');
            const hedefUye = message.mentions.members.first();
            const miktar = miktarCoz(argumanlar[2]);

            if (!hedefUye || isNaN(miktar) || miktar <= 0) return message.reply('❌ Örn: `.paracikar @üye 50m`');

            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[hedefUye.id].bakiye = Math.max(0, oyuncuVerileri[hedefUye.id].bakiye - miktar);
            return message.reply(`📉 <@${hedefUye.id}> cüzdanından **${miktar.toLocaleString('tr-TR')} €** çıkarıldı.`);
        }

        if (icerikKucuk.startsWith('.send')) {
            const hedefUye = message.mentions.members.first();
            const miktar = miktarCoz(argumanlar[2]);

            if (!hedefUye || hedefUye.id === message.author.id || isNaN(miktar) || miktar <= 0) return message.reply('❌ Örn: `.send @üye 10k`');

            veriGarantiEt(message.author.id);
            if (oyuncuVerileri[message.author.id].bakiye < miktar) return message.reply('❌ Paran yetersiz kanka.');

            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[message.author.id].bakiye -= miktar;
            oyuncuVerileri[hedefUye.id].bakiye += miktar;
            return message.reply(`✅ **${miktar.toLocaleString('tr-TR')} €** başarıyla <@${hedefUye.id}> hesabına aktarıldı.`);
        }

        // ==========================================
        // GELİŞMİŞ ANTRENMAN SİSTEMİ (18236.jpg GÖRSELİNE UYGUN)
        // ==========================================
        if (icerikKucuk === '.ant' || icerikKucuk === '.antrenman') {
            const id = message.author.id;
            veriGarantiEt(id);

            // Dinamik Cooldown Saat/Dakika/Saniye Kontrolü
            if (antrenmanCooldown.has(id)) {
                const gecenSure = Date.now() - antrenmanCooldown.get(id);
                if (gecenSure < 3600000) {
                    const kalanSureMetni = beklemeSüresiHesapla(3600000 - gecenSure);
                    const cdEmbed = new EmbedBuilder()
                        .setTitle('⏳ Antrenman Bekleme Süresi')
                        .setDescription(`Mevcut antrenman serini bozma kanka! Tekrar antrenman yapmak için **${kalanSureMetni}** beklemelisin.`)
                        .setColor(0xFF0000)
                        .setFooter({ text: 'Nors Antrenman Sistemi' });
                    return message.reply({ embeds: [cdEmbed] });
                }
            }

            // Antrenman Sayacı Artırma
            oyuncuVerileri[id].ant += 1;
            antrenmanCooldown.set(id, Date.now());

            const avatarURL = message.author.displayAvatarURL({ dynamic: true });

            if (oyuncuVerileri[id].ant >= 5) {
                // 5/5 Tamamlandı Görünümü
                const tamamEmbed = new EmbedBuilder()
                    .setTitle('⚡ ANTRENMAN SEZONU TAMAMLANDI!')
                    .setDescription(`🏆 **Mükemmel bir antrenman serisi bitirdin!**\n\n▬ ▬ ▬ ▬ ▬ **(5 / 5)**\n\n🎯 **Bilgi**\nYöneticiler piyasa değerini güncelleyecek!`)
                    .setThumbnail(avatarURL)
                    .setColor(0x00FF00)
                    .setFooter({ text: '⚽ Reality League Antrenman Sistemi' });

                oyuncuVerileri[id].ant = 0; // Seriyi sıfırla
                return message.reply({ embeds: [tamamEmbed] });
            } else {
                // Standart Antrenman Yapıldı Görünümü
                let cubuklar = "▬ ".repeat(oyuncuVerileri[id].ant) + "  ".repeat(5 - oyuncuVerileri[id].ant);
                const normalEmbed = new EmbedBuilder()
                    .setTitle('🏃‍♂️ ANTRENMAN YAPILDI!')
                    .setDescription(`💪 **Harika gidiyorsun! Formun her geçen gün artıyor.**\n\n${cubuklar}**(${oyuncuVerileri[id].ant} / 5)**\n\n🎯 **Bilgi**\nSeriyi tamamlamak için devam et kanka!`)
                    .setThumbnail(avatarURL)
                    .setColor(0x00A2E8)
                    .setFooter({ text: '⚽ Reality League Antrenman Sistemi' });
                return message.reply({ embeds: [normalEmbed] });
            }
        }

        // ==========================================
        // GELİŞMİŞ PENALTI SİSTEMİ (18237.jpg GÖRSELİNE UYGUN)
        // ==========================================
        if (icerikKucuk === '.pen' || icerikKucuk === '.penalti') {
            const id = message.author.id;
            veriGarantiEt(id);

            // Dinamik Cooldown Kontrolü
            if (penaltiCooldown.has(id)) {
                const gecenSure = Date.now() - penaltiCooldown.get(id);
                if (gecenSure < 3600000) {
                    const kalanSureMetni = beklemeSüresiHesapla(3600000 - gecenSure);
                    const cdEmbed = new EmbedBuilder()
                        .setTitle('🛡️ DEFANS BLOKLADIII! 🔵')
                        .setDescription(`Şut güçlüydü ama çizgi üzerindeki defans oyuncusu topu uzaklaştırdı!\n\n⏳ **Bekleme**\n${kalanSureMetni} sonra tekrar deneyebilirsin`)
                        .setColor(0x00A2E8)
                        .setFooter({ 
          
