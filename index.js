const { 
    Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

const SUNUCU_ID = '1511859511634301059'; // Senin verdiğin Sunucu ID
const YETKILI_ROL_ID = '1512316879551860796'; // !k ve .ara yetkili rolü
const YONETICI_ROL_ID = '1513269024866304091'; // Ticket yöneticisi
const TICKET_KATEGORI_ID = '1514324399900196895'; // Ticket kategorisi

let kayitSayilari = {}; 

client.once('ready', () => {
    console.log(`✅ Bot başarıyla aktif oldu: ${client.user.tag}`);
});

// Çökme Önleyici (Anti-Crash) - Botun kapanmasını engeller
process.on('unhandledRejection', (reason, p) => {
    console.error(' [HATA ÖNLEYİCİ] Yakalanmayan Reddedilme:', reason);
});
process.on('uncaughtException', (err, origin) => {
    console.error(' [HATA ÖNLEYİCİ] Yakalanmayan İstisna:', err);
});

client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot || !message.guild) return;

        const isYetkili = message.member.roles.cache.has(YETKILI_ROL_ID) || message.member.permissions.has(PermissionsBitField.Flags.Administrator);

        // --- 🎫 TICKET KURULUM ---
        if (message.content === '.ticket-kur' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_olustur').setLabel('📩 DESTEK TALEBİ OLUŞTUR').setStyle(ButtonStyle.Primary)
            );
            return message.channel.send({ content: '👇 **Destek almak için aşağıdaki butona tıkla:**', components: [row] });
        }

        if (!isYetkili) return;

        // --- !k KOMUTU ---
        if (message.content.startsWith('!k')) {
            const hedonUye = message.mentions.members.first();
            if (!hedonUye) return message.reply('❌ Kullanıcıyı etiketle kanka!');

            const metinKismi = message.content.substring(message.content.indexOf('>') + 1).trim();
            const parcalar = metinKismi.split('|').map(p => p.trim());
            if (parcalar.length < 4) return message.reply('❌ Format: `!k @user isim | mevki | bayrak | değer`');

            const yeniTakmaAd = `${parcalar[0]} | ${parcalar[1].toUpperCase()} | ${parcalar[2]} | ${parcalar[3]}`;

            try {
                await hedonUye.setNickname(yeniTakmaAd);
                
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`rol_futbolcu_${hedonUye.id}`).setLabel('⚽ Futbolcu').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(`rol_baskan_${hedonUye.id}`).setLabel('👑 Başkan').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`rol_td_${hedonUye.id}`).setLabel('📋 TD').setStyle(ButtonStyle.Danger)
                );

                await message.reply({ 
                    content: `📝 **KAYIT BAŞARILI KANKA!**\n\n👤 **Kayıt Edilen Üye:** ${hedonUye}\n🏷️ **Yeni Takma Adı:** \`${yeniTakmaAd}\`\n\n👇 **Lütfen aşağıdaki butonlardan rolünü seç:**`, 
                    components: [row] 
                });

                kayitSayilari[message.author.id] = (kayitSayilari[message.author.id] || 0) + 1;
            } catch (e) { 
                message.reply('❌ Rolünüz yetmediği için bu üyenin ismini değiştiremedim.'); 
            }
        }

        // --- .ara KOMUTU (SNT / Bayrak / Oyuncu Adı Arayan Kusursuz Sürüm) ---
        if (message.content.startsWith('.ara')) {
            let aranan = message.content.replace('.ara', '').trim();
            if (!aranan) return message.reply('❌ **Hata:** Bir arama kriteri gir kanka. Örn: `.ara SNT` veya `.ara 🇲🇫`');

            const guild = client.guilds.cache.get(SUNUCU_ID) || message.guild;
            
            // Üyeleri çekerken hata çıkarsa botun çökmesini önlüyoruz
            try {
                await guild.members.fetch();
            } catch (fetchErr) {
                console.error("Üyeler çekilemedi:", fetchErr);
                return message.reply("❌ Sunucu üyeleri yüklenirken bir hata oluştu. Lütfen botun ayarlardan 'Members Intent' kısmını açtığından emin ol kanka!");
            }
            
            const arananKucuk = aranan.toLowerCase().toLocaleLowerCase('tr-TR');

            const sonuclar = guild.members.cache.filter(m => {
                const nick = m.nickname ? m.nickname.toLowerCase().toLocaleLowerCase('tr-TR') : '';
                const username = m.user.username.toLowerCase().toLocaleLowerCase('tr-TR');
                return nick.includes(arananKucuk) || username.includes(arananKucuk) || (m.nickname && m.nickname.includes(aranan));
            });

            if (sonuclar.size === 0) return message.reply(`🔍 Aradığın kriterde (${aranan}) kimseyi bulamadım kanka.`);

            // Embedsiz Düz Metin Formatı: Takma Ad ve Mavi Bozulmayan Etiket
            const liste = sonuclar.map(m => `👤 **${m.displayName}** - <@${m.user.id}>`).slice(0, 20).join('\n');
            
            // users: [] sayesinde kimseye ping (bildirim) gitmez ama jilet gibi Mavi Etiket olur
            return message.reply({
                content: `🔍 **ARAMA SONUÇLARI: "${aranan}"**\n\n${liste}\n\n📊 **Toplam ${sonuclar.size} kişi bulundu.**`,
                allowedMentions: { users: [] }
            });
        }

    } catch (mainErr) {
        console.error("Mesaj işlenirken hata çıktı:", mainErr);
    }
});

// --- 🎟️ INTERACTION İŞLEYİCİ (Butonlar) ---
client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isButton()) return;

        // Ticket Oluşturma
        if (interaction.customId === 'ticket_olustur') {
            try {
                const kanalAdi = `ticket-${interaction.user.username}`;
                const kanal = await interaction.guild.channels.create({
                    name: kanalAdi,
                    type: ChannelType.GuildText,
                    parent: TICKET_KATEGORI_ID,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                        { id: YONETICI_ROL_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                    ]
                });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_kapat').setLabel('🔒 Bileti Kapat').setStyle(ButtonStyle.Danger)
                );

                await kanal.send({ content: `✅ Hoş geldin ${interaction.user}, <@&${YONETICI_ROL_ID}> ekibi seninle ilgilenecektir.`, components: [row] });
                return interaction.reply({ content: `🎫 Biletin başarıyla açıldı kanka: ${kanal}`, ephemeral: true });
            } catch (e) {
                return interaction.reply({ content: '❌ Bilet kanalı açılırken yetki hatası oluştu!', ephemeral: true });
            }
        }

        // Ticket Kapatma
        if (interaction.customId === 'ticket_kapat') {
            await interaction.reply('🔒 Bilet kanalı 5 saniye içinde tamamen siliniyor...');
            return setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }

        // Kayıt Rol Butonları
        const [prefix, rolKey, userId] = interaction.customId.split('_');
        const ROL_MAP = { 'futbolcu': '1512130383070892094', 'baskan': '1512323399467139213', 'td': '1513270136176381953' };

        if (prefix === 'rol') {
            try {
                const member = await interaction.guild.members.fetch(userId);
                await member.roles.add(ROL_MAP[rolKey]);
                const toplamKayit = kayitSayilari[interaction.user.id] || 0;
                return interaction.reply({ content: `✅ **İşlem Başarılı:** ${member.displayName} kullanıcısına rolü verildi!\n📈 **Senin Toplam Kayıt Sayın:** \`${toplamKayit}\`` });
            } catch (e) {
                return interaction.reply({ content: '❌ Rol verilirken bir hata çıktı! Botun rolü üyenin rolünden yukarıda olmalı.', ephemeral: true });
            }
        }
    } catch (intErr) {
        console.error("Buton işlenirken hata çıktı:", intErr);
    }
});

client.login(process.env.TOKEN);

