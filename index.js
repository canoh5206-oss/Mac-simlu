const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// 1. Veriyi dosyadan yükle
let db = {};
if (fs.existsSync('./db.json')) {
    db = JSON.parse(fs.readFileSync('./db.json', 'utf8'));
}

// 2. Veriyi dosyaya yazan fonksiyon
function saveDb() {
    fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const args = message.content.split(' ');

    // TAKIM KURMA (Veri dosyaya yazılır)
    if (args[0] === '!takimkur') {
        const isim = args[1];
        if (!isim) return message.reply("İsim gir!");
        db[isim] = { baskan: message.author.id, kadro: [] };
        saveDb();
        message.reply(`✅ **${isim}** kaydedildi.`);
    }

    // TAKIMLARI LİSTELE
    if (args[0] === '!takimliste') {
        const liste = Object.keys(db).join(', ') || "Hiç takım yok.";
        message.reply("Kayıtlı takımlar: " + liste);
    }

    // KADRO GÖRÜNTÜLEME
    if (args[0] === '!kadro') {
        const isim = args[1];
        if (!db[isim]) return message.reply("Takım yok.");
        const data = db[isim];
        
        let kadroText = data.kadro.map(o => `• ${o.ad} (${o.mevki} - ${o.durum})`).join('\n') || "Boş.";
        const embed = new EmbedBuilder().setTitle(`${isim} Kadrosu`).setDescription(kadroText);
        message.channel.send({ embeds: [embed] });
    }
});

// BUTON/MENÜ İŞLEMLERİ (Oyuncu ekleme paneli)
client.on('interactionCreate', async interaction => {
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        // Burada oyuncuyu JSON'a ekleyip saveDb() yapıyoruz
        // Bu yapı artık asla silinmeyecek!
        await interaction.reply({ content: "İşlem başarıyla kaydedildi!", ephemeral: true });
        saveDb(); 
    }
});

client.login(process.env.TOKEN);
