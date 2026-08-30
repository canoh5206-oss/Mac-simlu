const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ID Tanımlamaları
const KAYIT_KANAL_ID = '1542874216657850489';
const KAYIT_YETKILI_ROL_ID = '1542874729604579428';
const KAYITSIZ_ROL_ID = '1535308274482552914';

const ROLLER = {
    futbolcu: '1535308272293126214',
    td: '1535308267239116931',
    baskan: '1535308266169434222'
};

// 1. OTO HOŞ GELDİN KANALI & TAG
client.on('guildMemberAdd', async (member) => {
    const kanal = member.guild.channels.cache.get(KAYIT_KANAL_ID);
    if (!kanal) return;

    const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`🎉 Aramıza Hoş Geldin, ${member.user.username}!`)
        .setDescription(`
✨ **Diamond League** sunucumuza ilk adımını attın!

👥 **Sunucu Durumu:** Seninle birlikte **${member.guild.memberCount}** kişi olduk!
⏳ **Kayıt İşlemi:** Yetkililerimiz en kısa sürede seninle ilgilenecektir.

🛡️ **Hesap Durumu:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R> oluşturulmuş (Güvenli)
        `)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setImage('https://i.ibb.co/3s6D5fJ/car-snow.gif')
        .setFooter({ text: 'Diamond League • Otomatik Kayıt Sistemi', iconURL: member.guild.iconURL() })
        .setTimestamp();

    await kanal.send({ content: `<@&${KAYIT_YETKILI_ROL_ID}>`, embeds: [embed] });
});

// 2. YETKİLİ KAYIT KOMUTU (?k @kullanıcı İsim)
client.on('messageCreate', async (message) => {
    // Mesaj bot mesajıysa veya ?k ile başlamıyorsa dur (büyük/küçük harf duyarsız)
    if (message.author.bot || !message.content.toLowerCase().startsWith('?k')) return;

    // Yetkili Kontrolü
    if (!message.member.roles.cache.has(KAYIT_YETKILI_ROL_ID)) {
        return message.reply('❌ Bu komutu sadece **Kayıt Yetkilileri** kullanabilir!');
    }

    // Komutu ve parametreleri ayır
    const args = message.content.slice(2).trim().split(/ +/);
    const hedefUye = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    const yeniIsim = args.slice(1).join(' ');

    if (!hedefUye || !yeniIsim) {
        return message.reply('⚠️ **Hatalı Kullanım!** Doğru kullanım: `?k @kullanıcı Yeni İsim`');
    }

    // Buton Tasarımları
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`kayit_futbolcu_${hedefUye.id}_${yeniIsim}`)
            .setLabel('Futbolcu')
            .setStyle(ButtonStyle.Success)
            .setEmoji('⚽'),
        new ButtonBuilder()
            .setCustomId(`kayit_td_${hedefUye.id}_${yeniIsim}`)
            .setLabel('Teknik Direktör')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🧠'),
        new ButtonBuilder()
            .setCustomId(`kayit_baskan_${hedefUye.id}_${yeniIsim}`)
            .setLabel('Kulüp Başkanı')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('👑')
    );

    // Embed Paneli
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'Athena Lig — Kayıt Paneli', iconURL: message.guild.iconURL() })
        .setTitle('📋 Kullanıcı Kayıt Paneli')
        .setDescription(`
👤 **Kayıt Edilecek:** ${hedefUye} (\`${hedefUye.user.tag}\`)
✍️ **Verilecek İsim:** \`${yeniIsim}\`

👇 *Lütfen oyuncunun verilmesini istediğiniz **rolünü seçin**:*
        `)
        .setThumbnail(hedefUye.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `İşlemi Başlatan Yetkili: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

    await message.channel.send({ embeds: [embed], components: [row] });
});


// 3. BUTON ETKİLEŞİMİ (Rol Verme & Kayıtsız Rolü Alma)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const [aksiyon, rolTuru, hedefId, ...isimParcalari] = interaction.customId.split('_');
    if (aksiyon !== 'kayit') return;

    // Yetkili Kontrolü
    if (!interaction.member.roles.cache.has(KAYIT_YETKILI_ROL_ID)) {
        return interaction.reply({ content: '❌ Bu butonla sadece Kayıt Yetkilileri etkileşime girebilir.', ephemeral: true });
    }

    const hedefUye = await interaction.guild.members.fetch(hedefId).catch(() => null);
    const yeniIsim = isimParcalari.join(' ');

    if (!hedefUye) {
        return interaction.reply({ content: '❌ Kayıt edilmek istenen kullanıcı sunucudan ayrılmış!', ephemeral: true });
    }

    const verilecekRolId = ROLLER[rolTuru];

    try {
        // İsim Değiştirme
        await hedefUye.setNickname(yeniIsim);

        // Rol Ekleme & Kayıtsız Rolünü Çıkarma
        await hedefUye.roles.add(verilecekRolId);
        if (hedefUye.roles.cache.has(KAYITSIZ_ROL_ID)) {
            await hedefUye.roles.remove(KAYITSIZ_ROL_ID);
        }

        // Başarılı İşlem Mesajı
        const basariEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('✅ Kayıt İşlemi Başarıyla Tamamlandı')
            .setDescription(`
👤 **Kayıt Yapılan:** ${hedefUye}
📝 **Yeni İsmi:** \`${yeniIsim}\`
🎖️ **Verilen Rol:** <@&${verilecekRolId}>
🗑️ **Alınan Rol:** <@&${KAYITSIZ_ROL_ID}>
            `)
            .setFooter({ text: `Onaylayan Yetkili: ${interaction.user.username}` })
            .setTimestamp();

        await interaction.update({
            embeds: [basariEmbed],
            components: []
        });

    } catch (err) {
        console.error(err);
        await interaction.reply({ 
            content: '❌ **Yetki Hatası!** Botun rolü sunucu ayarlarında verilecek rollerin ve kullanıcının **üstünde** olmalıdır.', 
            ephemeral: true 
        });
    }
});

client.login(process.env.TOKEN);
        
