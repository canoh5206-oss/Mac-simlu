const { Client, GatewayIntentBits, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers
    ]
});

// ==========================================
// SABİT CONFIG VE ID AYARLARI
// ==========================================
const KAYIT_YETKILI_ROLLER = ['1520768910947782687']; 
const TAKIM_YETKILI_ROLLER = ['1519414839561158828'];
const OYUNCU_YETKILI_ROLLER = ['1520770167720771644', '1520770097558585344'];

const KAYIT_ODASI_ID = '1520767182563311737'; // Sadece burada kayıt yapılır
const KAYIT_DUYURU_KANAL_ID = '1520767204746858567'; // ss'teki hoş geldin kanalı

// Verilecek Buton Rolleri
const ROL_FUTBOLCU = '1520770217041727598';
const ROL_TD = '1520770167720771644';
const ROL_BASKAN = '1520770097558585344';

// Hafıza Veritabanları
let kayitVerileri = {}; 
let takimlar = {}; // { "takim adi": { baskan: "id", oyuncular: [] } }
let antrenmanCooldown = new Map(); // Saatlik kontrol
let penaltiCooldown = new Map();   // Saatlik kontrol

const KUFUR_LISTESI = ['amk', 'aq', 'orospu', 'piç', 'sik', 'göt', 'yarrak', '31', 'oe', 'oropusu'];

client.once('ready', () => {
    console.log(`⚽ Nors Futbol ve Altyapı Sistemi Aktif Kanka! Giriş: ${client.user.tag}`);
});

process.on('unhandledRejection', (reason, p) => { console.error(reason); });
process.on('uncaughtException', (err, origin) => { console.error(err); });

// ==========================================
// SUNUCUYA BİRİ KATILDIĞINDA ETİKETLEME
// ==========================================
client.on('guildMemberAdd', async (member) => {
    const kayitKanali = member.guild.channels.cache.get(KAYIT_ODASI_ID);
    if (kayitKanali) {
        kayitKanali.send({ content: `📥 <@${member.id}> sunucuya katıldı! <@&1520768910947782687> yetkilileri lütfen kaydet kanka.` }).catch(() => {});
    }
});

// ==========================================
// MESAJ MERKEZİ (KOMUTLAR VE KORUMALAR)
// ==========================================
client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot || !message.guild) return;

        const icerik = message.content.trim();
        const icerikKucuk = icerik.toLowerCase();

        // --- GÜVENLİK KORUMASI (MUTE 2 DAKİKA) ---
        const kufurVarMi = KUFUR_LISTESI.some(kufur => new RegExp(`\\b${kufur}\\b`, 'i').test(icerikKucuk));
        if (kufurVarMi && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await message.delete().catch(() => {});
            await message.member.timeout(2 * 60 * 1000, 'Sohbette küfür/argo kullanımı.').catch(() => {});
            return message.channel.send(`⚠️ <@${message.author.id}> küfür ettiği için **2 dakika** susturuldu kanka.`);
        }

        // --- 1. -kayit KOMUTU ---
        if (icerikKucuk.startsWith('-kayit')) {
            if (message.channel.id !== KAYIT_ODASI_ID) {
                const hataEmbed = new EmbedBuilder()
                    .setTitle('🔻 HATA!')
                    .setDescription(`Komut, bu kanalda kullanılmaz. Lütfen seçili olan <#${KAYIT_ODASI_ID}> kanalında kullanın kanka.`)
                    .setColor(0xFF0000)
                    .setFooter({ text: `Nors | bugün saat ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` });
                return message.reply({ embeds: [hataEmbed] });
            }

            const yetkiliMi = message.member.roles.cache.some(r => KAYIT_YETKILI_ROLLER.includes(r.id));
            if (!yetkiliMi) return message.reply('❌ Kanka bu komutu kullanmak için kayıt yetkilisi rolüne sahip olmalısın.');

            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ Kayıt edilecek üyeyi etiketle kanka! Örn: `-kayit @üye İsim | Mevki | Değer`');

            const metinKismi = icerik.substring(icerik.indexOf('>') + 1).trim();
            if (!metinKismi.includes('|')) return message.reply('❌ Format hatalı kanka! Örn: `İsim | Mevki | Değer` şeklinde yazmalısın.');

            await hedefUye.setNickname(metinKismi).catch(() => {});

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`k_futbolcu_${hedefUye.id}`).setLabel('⚽ Futbolcu').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`k_td_${hedefUye.id}`).setLabel('📋 Teknik Direktör').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`k_baskan_${hedefUye.id}`).setLabel('👑 Takım Başkanı').setStyle(ButtonStyle.Success)
            );

            return message.reply({
                content: `📝 <@${hedefUye.id}> adı dökümana işlendi. Rolünü aşağıdaki butonlardan seç kanka:`,
                components: [row]
            });
        }

        // --- 2. .yardim KOMUTU ---
        if (icerikKucuk === '.yardim') {
            const embed = new EmbedBuilder()
                .setTitle('📋 Nors Bot Komut Listesi')
                .setColor(0x2F3136)
                .setDescription(
                    `**.takimkur <Takım İsmi>** - Sunucuya yeni takım kurar.\n` +
                    `**.takimliste** - Kurulu takımları listeler.\n` +
                    `**.oyuncuekle @üye <Takım İsmi>** - Takıma oyuncu transfer eder.\n` +
                    `**.oyuncucikar @üye <Takım İsmi>** - Takımdan oyuncuyu çıkartır.\n` +
                    `**.ant** - Saatlik antrenman hakkını kullanır (5/5 düzeni).\n` +
                    `**.pen** - Saatlik penaltı antrenmanını başlatır.\n` +
                    `**.post <Metin>** - Profil fotoğrafı eşliğinde duyuru postu atar.\n` +
                    `**-kayit @üye <Format>** - Kayıt odasında yeni üye kaydeder.`
                );
            return message.reply({ embeds: [embed] });
        }

        // --- 3. .takimkur KOMUTU ---
        if (icerikKucuk.startsWith('.takimkur')) {
            const yetkiliMi = message.member.roles.cache.some(r => TAKIM_YETKILI_ROLLER.includes(r.id));
            if (!yetkiliMi) return message.reply('❌ Bu komutu sadece belirlenen Lig Yetkilileri kullanabilir kanka.');

            const takimAdi = icerik.substring(9).trim();
            if (!takimAdi) return message.reply('❌ Kurulacak takımın adını yaz kanka! Örn: `.takimkur Karagör SK`');

            if (takimlar[takimAdi]) return message.reply('❌ Bu takım zaten kurulmuş kanka.');

            takimlar[takimAdi] = { baskan: 'Girilmedi', oyuncular: [] };
            return message.reply(`✅ **${takimAdi}** başarıyla kuruldu kanka! Kulüp başkanını eklemek için \`.oyuncuekle\` komutunu kullanabilirsin.`);
        }

        // --- 4. .takimliste KOMUTU ---
        if (icerikKucuk.startsWith('.takimliste')) {
            const args = icerik.split(' ');
            if (args.length > 1) {
                // Detaylı takım sorgusu: .takimliste [Takım Adı]
                const arananTakim = icerik.substring(12).trim();
                if (!takimlar[arananTakim]) return message.reply('❌ Böyle bir takım bulunamadı kanka.');
                
                const veri = takimlar[arananTakim];
                return message.reply(`📋 **${arananTakim} Verileri:**\n👑 **Başkan:** ${veri.baskan}\n🏃‍♂️ **Oyuncular:** ${veri.oyuncular.length > 0 ? veri.oyuncular.join(', ') : 'Oyuncu Yok'}`);
            }

            // Genel liste
            const tumTakimlar = Object.keys(takimlar);
            if (tumTakimlar.length === 0) return message.reply('📭 Sunucuda henüz hiç takım kurulmamış kanka.');
            return message.reply(`🏆 **Aktif Sunucu Takımları:**\n${tumTakimlar.map(t => `• ${t}`).join('\n')}`);
        }

        // --- 5. .oyuncuekle KOMUTU ---
        if (icerikKucuk.startsWith('.oyuncuekle')) {
            const yetkiliMi = message.member.roles.cache.some(r => OYUNCU_YETKILI_ROLLER.includes(r.id));
            if (!yetkiliMi) return message.reply('❌ Oyuncu ekleme yetkiniz bulunmuyor kanka.');

            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ Eklenecek oyuncuyu etiketle kanka!');

            const takimAdi = icerik.substring(icerik.indexOf('>') + 1).trim();
            if (!takimlar[takimAdi]) return message.reply(`❌ \`${takimAdi}\` adında bir takım sistemde yok kanka.`);

            if (hedefUye.roles.cache.has(ROL_BASKAN)) {
                takimlar[takimAdi].baskan = `<@${hedefUye.id}>`;
            } else {
                takimlar[takimAdi].oyuncular.push(`<@${hedefUye.id}>`);
            }

            return message.reply(`✅ <@${hedefUye.id}> kulübüyle anlaşarak **${takimAdi}** kadrosuna dahil edildi kanka!`);
        }

        // --- 6. .oyuncucikar KOMUTU ---
        if (icerikKucuk.startsWith('.oyuncucikar')) {
            const yetkiliMi = message.member.roles.cache.some(r => OYUNCU_YETKILI_ROLLER.includes(r.id));
            if (!yetkiliMi) return message.reply('❌ Oyuncu çıkarma yetkiniz bulunmuyor kanka.');

            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ Çıkarılacak oyuncuyu etiketle kanka!');

            const takimAdi = icerik.substring(icerik.indexOf('>') + 1).trim();
            if (!takimlar[takimAdi]) return message.reply('❌ Takım bulunamadı kanka.');

            if (takimlar[takimAdi].baskan === `<@${hedefUye.id}>`) {
                takimlar[takimAdi].baskan = 'Girilmedi';
            } else {
                takimlar[takimAdi].oyuncular = takimlar[takimAdi].oyuncular.filter(o => o !== `<@${hedefUye.id}>`);
            }

            return message.reply(`📭 <@${hedefUye.id}>, **${takimAdi}** takımından feshedilerek ayrıldı kanka.`);
        }

        // --- 7. .ant KOMUTU ---
        if (icerikKucuk === '.ant') {
            const id = message.author.id;
            if (antrenmanCooldown.has(id) && Date.now() - antrenmanCooldown.get(id) < 3600000) {
                const kalanSure = Math.ceil((3600000 - (Date.now() - antrenmanCooldown.get(id))) / 60000);
                return message.reply(`⏳ Kanka antrenman saatliktir! Tekrar çalışmak için **${kalanSure} dakika** beklemelisin.`);
            }

            antrenmanCooldown.set(id, Date.now());
            const skorlar = ['5/5', '5/4', '5/3', '5/2'];
            const rastgeleSkor = skorlar[Math.floor(Math.random() * skorlar.length)];

            const embed = new EmbedBuilder()
                .setTitle('🎽 Antrenman Tamamlandı!')
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setColor(0x3A82E6)
                .setDescription(`🏃‍♂️ **<@${message.author.id}>** tesislere inerek bugünkü antrenmanını başarıyla bitirdi.\n\n📊 **Performans Verisi:** \`${rastgeleSkor}\` \n⏰ **Kalan Hak:** \`0/1 (Gelecek Saat Sıfırlanır)\``);
            
            return message.reply({ embeds: [embed] });
        }

        // --- 8. .pen KOMUTU ---
        if (icerikKucuk === '.pen') {
            const id = message.author.id;
            if (penaltiCooldown.has(id) && Date.now() - penaltiCooldown.get(id) < 3600000) {
                return message.reply(`⏳ Saatte sadece bir kez penaltı çalışabilirsin kanka.`);
            }

            penaltiCooldown.set(id, Date.now());
            const ihtimaller = ['⚽ GOL!', '🧤 KALECİ KURTARDI!', '💥 TOP DİREKTEN DÖNDÜ!'];
            const sonuc = ihtimaller[Math.floor(Math.random() * ihtimaller.length)];

            const embed = new EmbedBuilder()
                .setTitle('🥅 Penaltı Atışı!')
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setColor(0xFFAA00)
                .setDescription(`⚽ **<@${message.author.id}>** beyaz noktaya topu dikti, hakem düdüğünü çaldı ve vuruşunu yaptı...\n\n🎯 **Şutun Sonucu:** **${sonuc}**`);
            
            return message.reply({ embeds: [embed] });
        }

        // --- 9. .post KOMUTU ---
        if (icerikKucuk.startsWith('.post')) {
            const duyuruMetni = icerik.substring(5).trim();
            if (!duyuruMetni) return message.reply('❌ Paylaşılacak gönderiyi yaz kanka.');

            const embed = new EmbedBuilder()
                .setTitle('📢 Sosyal Medya Paylaşımı')
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setColor(0x2F3136)
                .setDescription(`${duyuruMetni}\n\n✍️ *Yazar: <@${message.author.id}>*`);
            
            return message.reply({ embeds: [embed] });
        }

    } catch (e) { console.error(e); }
});

// ==========================================
// INTERACTION CENTER (KAYIT TAMAMLAMA)
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const [prefix, rolTipi, hedefId] = interaction.customId.split('_');
    if (prefix !== 'k') return;

    try {
        const guild = interaction.guild;
        const hedefUye = await guild.members.fetch(hedefId).catch(() => null);
        if (!hedefUye) return interaction.reply({ content: '❌ Kullanıcı sunucudan çıkmış kanka!', ephemeral: true });

        let rolId = '';
        let rolIsmi = '';

        if (rolTipi === 'futbolcu') { rolId = ROL_FUTBOLCU; rolIsmi = 'Futbolcu'; }
        else if (rolTipi === 'td') { rolId = ROL_TD; rolIsmi = 'Teknik Direktör'; }
        else if (rolTipi === 'baskan') { rolId = ROL_BASKAN; rolIsmi = 'Takım Başkanı'; }

        await hedefUye.roles.add(rolId).catch(() => {});
        kayitVerileri[interaction.user.id] = (kayitVerileri[interaction.user.id] || 0) + 1;

        await interaction.message.delete().catch(() => {});

        // 18159.jpg Ekran Görüntüsündeki Birebir Kusursuz Embed Bildirimi
        const duyuruKanali = guild.channels.cache.get(KAYIT_DUYURU_KANAL_ID);
        if (duyuruKanali) {
            await duyuruKanali.send({ content: `📢 **<@${hedefUye.id}> aramıza katıldı.**` }).catch(() => {});

            const embed = new EmbedBuilder()
                .setTitle('✨ Kayıt Yapıldı!')
                .setDescription(
                    `🤝 • <@${hedefUye.id}> aramıza **${rolIsmi}** rolleriyle katıldı.\n\n` +
                    `🌟 • **Kaydı gerçekleştiren yetkili:**\n<@${interaction.user.id}>\n\n` +
                    `🐼 • **Aramıza hoş geldin**\n<@${hedefUye.id}>`
                )
                .setColor(0x2F3136)
                .setThumbnail(hedefUye.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Nors Kayıt Sistemi' });

            await duyuruKanali.send({ embeds: [embed] }).catch(() => {});
        }

        return interaction.reply({ content: `✅ <@${hedefUye.id}> kaydedildi ve ${rolIsmi} rolü tanımlandı!`, ephemeral: true });

    } catch (err) {
        console.error(err);
    }
});

client.login(process.env.TOKEN);
                    
