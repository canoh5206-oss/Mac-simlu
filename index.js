const { Client, GatewayIntentBits, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

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
const TAKIM_OWNER_ROL_ID = '1519414839561158828'; 
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
let takimlar = {}; 
let antrenmanCooldown = new Map(); 
let penaltiCooldown = new Map();   

const KUFUR_LISTESI = ['amk', 'aq', 'orospu', 'piç', 'sik', 'göt', 'yarrak', '31', 'oe', 'oropusu'];

// 🎯 K, M, B KISALTMALARI SAYIYA ÇEVİREN FONKSİYON
function miktarCoz(metin) {
    if (!metin || typeof metin !== 'string') return NaN;
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
    if (isNaN(sayi) || sayi < 0) return '0M';
    if (sayi >= 1000000000) return (sayi / 1000000000).toFixed(0) + 'B'; 
    if (sayi >= 1000000) return (sayi / 1000000).toFixed(0) + 'M';
    if (sayi >= 1000) return (sayi / 1000).toFixed(0) + 'K';
    return sayi.toString();
}

function veriGarantiEt(id) {
    if (!oyuncuVerileri[id]) {
        oyuncuVerileri[id] = { ant: 0, bakiye: 0, banka: 0 };
    }
    if (oyuncuVerileri[id].bakiye === undefined) oyuncuVerileri[id].bakiye = 0;
    if (oyuncuVerileri[id].banka === undefined) oyuncuVerileri[id].banka = 0;
}

// 🎯 OTOMATİK İSİM VE DEĞER MOTORU
async function degerIsle(member, miktar, islemTipi) {
    let eskiIsim = member.displayName || member.user.username;
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
    console.log(`⚽ Nors Bot Hata Korumaları Artırılarak Başlatıldı!`);
});

// Panel çökmesin diye tüm hataları burası yakalar
process.on('unhandledRejection', (reason) => { console.error("🔴 Yakalanan Hata:", reason); });
process.on('uncaughtException', (err) => { console.error("🔴 Kritik Hata Yakalandı:", err); });

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
                    `• \`.pen\` - Penaltı atarsınız (1 saat cooldown).\n\n` +
                    `🛡️ **Takım Yönetim Komutları:**\n` +
                    `• \`.takimkur @baskan [Takım Adı]\` - Yeni bir takım kurar (Sadece Owner).\n` +
                    `• \`.takimliste\` - Kurulan tüm takımları listeler.\n\n` +
                    `💰 **Ekonomi Komutları (k, m, b geçerli):**\n` +
                    `• \`.bakiye\` veya \`.bal\` - Cüzdan bilgilerinizi gösterir.\n` +
                    `• \`.send @üye [Miktar]\` - Oyuncuya para transfer eder.\n` +
                    `• \`.paraver @üye [Miktar]\` - Yetkili oyuncuya para ekler.\n` +
                    `• \`.paracikar @üye [Miktar]\` - Yetkili oyuncudan para siler.\n\n` +
                    `📈 **Değer Yönetim Komutları (k, m, b geçerli):**\n` +
                    `• \`.degerver @üye [Miktar]\` - Oyuncunun ismindeki değeri artırır.\n` +
                    `• \`.degercikar @üye [Miktar]\` - Oyuncunun ismindeki değeri düşürür.\n\n` +
                    `📥 **Kayıt Komutları:**\n` +
                    `• \`-k @üye [İsim | Pozisyon | Bayrak | Değer]\` - Serbest kayıt yapar.`
                )
                .setFooter({ text: 'Nors Lig Yönetim Sistemi' });
            return message.reply({ embeds: [yardimEmbed] });
        }

        // --- .takimkur KOMUTU ---
        if (icerikKucuk.startsWith('.takimkur')) {
            if (!message.member.roles.cache.has(TAKIM_OWNER_ROL_ID)) return message.reply('❌ Bu komutu sadece Takım Owner rolüne sahip yetkililer kullanabilir kanka!');

            const baskan = message.mentions.members.first();
            if (!baskan || argumanlar.length < 3) return message.reply('❌ Yanlış kullanım kanka! Örn: `.takimkur @baskan Bursaspor`');
            
            const takimAdi = argumanlar.slice(2).join(' ');

            takimlar[takimAdi.toLowerCase()] = {
                isim: takimAdi,
                baskanId: baskan.id,
                baskanIsim: baskan.user.username
            };

            return message.reply(`✅ **${takimAdi}** takımı başarıyla kuruldu ve başkanlığına <@${baskan.id}> getirildi kanka!`);
        }

        // --- .takimliste KOMUTU ---
        if (icerikKucuk === '.takimliste') {
            const takimListesi = Object.values(takimlar);
            if (takimListesi.length === 0) return message.reply('📭 Şu an sunucuda kurulmuş hiç takım yok kanka.');

            const listeEmbed = new EmbedBuilder()
                .setTitle('🛡️ Sunucu Takım Listesi')
                .setColor(0x2F3136)
                .setThumbnail(message.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL())
                .setDescription(takimListesi.map((t, index) => `${index + 1}. ⚽ **${t.isim}** - Başkan: <@${t.baskanId}>`).join('\n'))
                .setFooter({ text: 'Nors Lig Yönetimi' });

            return message.reply({ embeds: [listeEmbed] });
        }

        // --- -k SERBEST KAYIT ---
        if (icerikKucuk.startsWith('-k') || icerikKucuk.startsWith('-kayit')) {
            if (message.channel.id !== KAYIT_ODASI_ID) return;
            if (!message.member.roles.cache.some(r => KAYIT_YETKILI_ROLLER.includes(r.id))) return message.reply('❌ Kayıt yetkilisi rolün yok kanka.');

            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ Üyeyi etiketle kanka! Örn: `-k @üye Osimhen | SNT | 🇵🇹 | 1M`');

            const metinKismi = icerik.substring(icerik.indexOf('>') + 1).trim();
            if (!metinKismi) return message.reply('❌ Formatı tam yaz kanka!');

            await hedefUye.setNickname(metinKismi).catch(() => {});

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`k_futbolcu_${hedefUye.id}`).setLabel('⚽ Futbolcu').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`k_td_${hedefUye.id}`).setLabel('📋 Teknik Direktör').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`k_baskan_${hedefUye.id}`).setLabel('👑 Takım Başkanı').setStyle(ButtonStyle.Success)
            );

            return message.reply({ content: `📝 <@${hedefUye.id}> ismi ayarlandı. Rol seç kanka:`, components: [row] });
        }

        // --- .degerver KOMUTU ---
        if (icerikKucuk.startsWith('.degerver')) {
            if (!message.member.roles.cache.has(DEGER_YETKILI_ROL)) return message.reply('❌ Değer yetkilisi rolün yok kanka.');

            const hedefUye = message.mentions.members.first();
            if (!hedefUye || argumanlar.length < 3) return message.reply('❌ Yanlış kullanım. Örn: `.degerver @üye 5m`');
            
            const miktarStr = argumanlar[2];
            const miktar = miktarCoz(miktarStr);

            if (isNaN(miktar)) return message.reply('❌ Lütfen geçerli bir miktar gir kanka! Örn: `5m`');

            const sonuc = await degerIsle(hedefUye, miktar, 'artir');
            message.reply(`✅ <@${hedefUye.id}> oyuncusunun değeri artırıldı!\n Yeni İsmi: \`${sonuc.yeniIsim}\``);

            const bildiriKanali = message.guild.channels.cache.get(DEGER_BILDIRI_KANAL_ID);
            if (bildiriKanali) {
                const bEmbed = new EmbedBuilder()
                    .setAuthor({ name: 'Değer Güncellemesi!', iconURL: message.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL() })
                    .setDescription(`📈 <@${hedefUye.id}> oyuncusunun değeri **${sonuc.eskiDeger}** seviyesinden **${sonuc.yeniDeger}** seviyesine yükseltildi!\n\n**Yetkili:** <@${message.author.id}>`)
                    .setColor(0x00FF00)
                    .setTimestamp();
                bildiriKanali.send({ embeds: [bEmbed] }).catch(() => {});
            }
            return;
        }

        // --- .degercikar KOMUTU ---
        if (icerikKucuk.startsWith('.degercikar')) {
            if (!message.member.roles.cache.has(DEGER_YETKILI_ROL)) return message.reply('❌ Değer yetkilisi rolün yok kanka.');

            const hedefUye = message.mentions.members.first();
            if (!hedefUye || argumanlar.length < 3) return message.reply('❌ Yanlış kullanım. Örn: `.degercikar @üye 5m`');
            
            const miktarStr = argumanlar[2];
            const miktar = miktarCoz(miktarStr);

            if (isNaN(miktar)) return message.reply('❌ Lütfen geçerli bir miktar gir kanka! Örn: `2m`');

            const sonuc = await degerIsle(hedefUye, miktar, 'azalt');
            message.reply(`📉 <@${hedefUye.id}> oyuncusunun değeri düşürüldü!\n Yeni İsmi: \`${sonuc.yeniIsim}\``);

            const bildiriKanali = message.guild.channels.cache.get(DEGER_BILDIRI_KANAL_ID);
            if (bildiriKanali) {
                const bEmbed = new EmbedBuilder()
                    .setAuthor({ name: 'Değer Güncellemesi!', iconURL: message.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL() })
                    .setDescription(`📉 <@${hedefUye.id}> oyuncusunun değeri **${sonuc.eskiDeger}** seviyesinden **${sonuc.yeniDeger}** seviyesine düşürüldü.\n\n**Yetkili:** <@${message.author.id}>`)
                    .setColor(0xFF0000)
                    .setTimestamp();
                bildiriKanali.send({ embeds: [bEmbed] }).catch(() => {});
            }
            return;
        }

        // --- .bakiye / .bal ---
        if (icerikKucuk.startsWith('.bakiye') || icerikKucuk.startsWith('.bal')) {
            const hedefUye = message.mentions.members.first() || message.member;
            veriGarantiEt(hedefUye.id);

            const nakit = oyuncuVerileri[hedefUye.id].bakiye;
            const banka = oyuncuVerileri[hedefUye.id].banka;
            const toplam = nakit + banka;

            const bakiyeEmbed = new EmbedBuilder()
                .setAuthor({ name: `${hedefUye.user.username}'ın Cüzdanı`, iconURL: hedefUye.user.displayAvatarURL({ dynamic: true }) || client.user.displayAvatarURL() })
                .setTitle('💰 Bakiye Bilgileri')
                .setThumbnail(hedefUye.user.displayAvatarURL({ dynamic: true }) || client.user.displayAvatarURL())
                .setColor(0xFFAA00) 
                .setDescription(`💵 **Para**\n${nakit.toLocaleString('tr-TR')}€\n\n🏦 **Banka**\n${banka.toLocaleString('tr-TR')}€\n\n💎 **Toplam Servet**\n${toplam.toLocaleString('tr-TR')}€`)
                .setFooter({ text: 'Son güncelleme • Nors Ekonomi' });

            return message.reply({ embeds: [bakiyeEmbed] });
        }

        // --- .paraver ---
        if (icerikKucuk.startsWith('.paraver')) {
            if (!message.member.roles.cache.has(TAKIM_OWNER_ROL_ID)) return message.reply('❌ Ekonomi yetkin yok kanka.');
            const hedefUye = message.mentions.members.first();
            if (!hedefUye || argumanlar.length < 3) return message.reply('❌ Örn: `.paraver @üye 100k`');
            
            const miktar = miktarCoz(argumanlar[2]);
            if (isNaN(miktar) || miktar <= 0) return message.reply('❌ Geçersiz para miktarı kanka.');

            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[hedefUye.id].bakiye += miktar;
            return message.reply(`💰 <@${hedefUye.id}> cüzdanına **${miktar.toLocaleString('tr-TR')} €** eklendi kanka.`);
        }

        // --- .paracikar ---
        if (icerikKucuk.startsWith('.paracikar')) {
            if (!message.member.roles.cache.has(TAKIM_OWNER_ROL_ID)) return message.reply('❌ Ekonomi yetkin yok kanka.');
            const hedefUye = message.mentions.members.first();
            if (!hedefUye || argumanlar.length < 3) return message.reply('❌ Örn: `.paracikar @üye 50m`');
            
            const miktar = miktarCoz(argumanlar[2]);
            if (isNaN(miktar) || miktar <= 0) return message.reply('❌ Geçersiz para miktarı kanka.');

            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[hedefUye.id].bakiye = Math.max(0, oyuncuVerileri[hedefUye.id].bakiye - miktar);
            return message.reply(`📉 <@${hedefUye.id}> cüzdanından **${miktar.toLocaleString('tr-TR')} €** çıkarıldı.`);
        }

        // --- .send ---
        if (icerikKucuk.startsWith('.send')) {
            const hedefUye = message.mentions.members.first();
            if (!hedefUye || argumanlar.length < 3) return message.reply('❌ Örn: `.send @üye 10k`');
            
            const miktar = miktarCoz(argumanlar[2]);
            if (hedefUye.id === message.author.id || isNaN(miktar) || miktar <= 0) return message.reply('❌ Geçersiz işlem kanka.');

            veriGarantiEt(message.author.id);
            if (oyuncuVerileri[message.author.id].bakiye < miktar) return message.reply('❌ Paran yetersiz kanka.');

            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[message.author.id].bakiye -= miktar;
            oyuncuVerileri[hedefUye.id].bakiye += miktar;
            return message.reply(`✅ **${miktar.toLocaleString('tr-TR')} €** başarıyla <@${hedefUye.id}> hesabına aktarıldı.`);
        }

        // --- DİĞER STANDART KOMUTLAR ---
        if (icerikKucuk === '.ant') {
            const id = message.author.id;
            if (antrenmanCooldown.has(id) && Date.now() - antrenmanCooldown.get(id) < 3600000) return message.reply('⏳ Saatte bir antrenman yapabilirsin.');
            veriGarantiEt(id);
            if (!oyuncuVerileri[id].ant) oyuncuVerileri[id].ant = 0;
            if (oyuncuVerileri[id].ant < 5) oyuncuVerileri[id].ant += 1;
            antrenmanCooldown.set(id, Date.now());
            return message.reply(`🏃‍♂️ Antrenman yapıldı. Durum: \`${oyuncuVerileri[id].ant}/5\``);
        }

        if (icerikKucuk === '.pen') {
            const id = message.author.id;
            if (penaltiCooldown.has(id) && Date.now() - penaltiCooldown.get(id) < 3600000) return message.reply('⏳ Saatte bir penaltı atabilirsin.');
            penaltiCooldown.set(id, Date.now());
            const res = ['⚽ GOL!', '🧤 KALECİ KURTARDI!', '💥 DİREK!'][Math.floor(Math.random() * 3)];
            return message.reply(`🥅 Şut çekildi... Sonuç: **${res}**`);
        }

    } catch (err) { console.error("Mesaj Hatası Gerilemesi:", err); }
});

// ==========================================
// BUTON ETKİLEŞİM MERKEZİ
// ==========================================
client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isButton()) return;

        if (interaction.customId.startsWith('btn_kayit_baslat_')) {
            if (!interaction.member.roles.cache.some(r => KAYIT_YETKILI_ROLLER.includes(r.id))) {
                return interaction.reply({ content: '❌ Kayıt yetkilisi değilsin kanka!', ephemeral: true });
            }
            const hedefUyeId = interaction.customId.replace('btn_kayit_baslat_', '');
            return interaction.reply({ content: `🚀 Kayıt başlatıldı! Kanala direkt \`-k <@${hedefUyeId}> İsim | Pozisyon | Bayrak | 1M\` formatında yazıp rolleri ver kanka.`, ephemeral: true });
        }

        const [prefix, rolTipi, deleteId] = interaction.customId.split('_');
        if (prefix !== 'k') return;
});

client.login(process.env.TOKEN);
        
