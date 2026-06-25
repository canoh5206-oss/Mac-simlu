 const { 
    Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers
    ]
});

const YETKILI_ROL_ID = '1512316879551860796'; // !k ve .ara kullanabilecek rol
const YONETICI_ROL_ID = '1513269024866304091'; // Biletlere bakacak rol
const TICKET_KATEGORI_ID = '1514324399900196895'; // Biletlerin açılacağı kategori

let kayitSayilari = {};

client.once('ready', () => {
    console.log(`✅ Kayıt, Arama ve Ticket Sistemi Aktif: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const isYetkili = message.member.roles.cache.has(YETKILI_ROL_ID) || message.member.permissions.has('Administrator');

    // --- 🎫 TICKET KURULUM KOMUTU (Sadece Yöneticiler) ---
    if (message.content === '.ticket-kur' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_olustur').setLabel('📩 DESTEK TALEBİ OLUŞTUR').setStyle(ButtonStyle.Primary)
        );
        return message.channel.send({ content: '👇 **Destek almak için aşağıdaki butona tıkla:**', components: [row] });
    }

    // Yetkili olmayanlar bundan sonraki komutları tetikleyemez
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
                new ButtonBuilder().setCustomId(`rol_baskan_${hededonUye.id || hedonUye.id}`).setLabel('👑 Başkan').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`rol_td_${hedonUye.id}`).setLabel('📋 TD').setStyle(ButtonStyle.Danger)
            );

            await message.reply({ 
                content: `📝 **KAYIT BAŞARILI KANKA!**\n\n👤 **Kayıt Edilen Üye:** ${hedonUye}\n🏷️ **Yeni Takma Adı:** \`${yeniTakmaAd}\`\n\n👇 **Lütfen aşağıdaki butonlardan rolünü seç:**`, 
                components: [row] 
            });

            kayitSayilari[message.author.id] = (kayitSayilari[message.author.id] || 0) + 1;
        } catch (e) { message.reply('❌ Yetki hatası! İsmi değiştirilemedi.'); }
    }
  }):
        // --- .ara KOMUTU ---
    if (message.content.startsWith('.ara')) {
        let aranan = message.content.replace('.ara', '').trim();
        if (!aranan) return message.reply('❌ **Hata:** Bir isim, mevki veya bayrak gir kanka. Örn: `.ara fransa`');

        await message.guild.members.fetch(); 
        
        const arananKucuk = aranan.toLowerCase().toLocaleLowerCase('tr-TR');
        const fransaKelimeleri = ['fransa', 'fransız', 'fransiz', 'fr', 'fra', '🇲🇫', '🇫🇷'];
        const fransaAraniyorMu = fransaKelimeleri.includes(arananKucuk);

        const sonuclar = message.guild.members.cache.filter(m => {
            const nick = m.nickname ? m.nickname.toLowerCase().toLocaleLowerCase('tr-TR') : '';
            const username = m.user.username.toLowerCase().toLocaleLowerCase('tr-TR');
            
            if (fransaAraniyorMu) {
                return nick.includes('🇲🇫') || nick.includes('🇫🇷') || nick.includes('fransa') || nick.includes('fransiz') ||
                       username.includes('fransa') || username.includes('fransiz');
            }
            return nick.includes(arananKucuk) || username.includes(arananKucuk) || (m.nickname && m.nickname.includes(aranan));
        });

        if (sonuclar.size === 0) return message.reply(`🔍 Aradığın kriterde (${aranan}) kimseyi bulamadım kanka.`);

        const liste = sonuclar.map(m => `👤 **${m.displayName}** - ${m.user.toString()}`).slice(0, 15).join('\n');
        
        const embed = new EmbedBuilder()
            .setTitle(`🔍 Arama Sonuçları: "${aranan}"`)
            .setDescription(liste)
            .setColor(0xF1C40F)
            .setFooter({ text: `${sonuclar.size} kişi bulundu.` });

        message.reply({ embeds: [embed] });
    }
});

// --- 🎟️ INTERACTION İŞLEYİCİ (Butonlar) ---
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // Ticket Oluşturma Butonu
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
            return interaction.reply({ content: `🎫 Biletin başarıyla açıldı l: ${kanal}`, ephemeral: true });
        } catch (e) {
            return interaction.reply({ content: '❌ Bilet kanalı açılırken yetki hatası oluştu!', ephemeral: true });
        }
    }

    // Ticket Kapatma Butonu
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
            return interaction.reply({ content: '❌ Rol verilirken bir hata çıktı!', ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
