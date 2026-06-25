const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers 
    ] 
});

let db = {};
if (fs.existsSync('./db.json')) {
    db = JSON.parse(fs.readFileSync('./db.json', 'utf8'));
}

function saveDb() { fs.writeFileSync('./db.json', JSON.stringify(db, null, 2)); }

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const args = message.content.split(' ');
    const komut = args[0];

    // .oyuncuekle Fenerbahçe Forvet 🇲🇫 @kullanıcı
    if (komut === '.oyuncuekle') {
        const takimAdi = args[1];
        const mevki = args[2];
        const bayrak = args[3];
        
        // ÖNEMLİ: Etiketi yakala
        const hedefUye = message.mentions.members.first();
        
        if (!hedefUye) {
            return message.reply("❌ Oyuncuyu etiketlemeyi unuttun! Örnek: .oyuncuekle TakımAdı Forvet 🇲🇫 @kullanıcı");
        }

        if (!db[takimAdi]) {
            return message.reply(`❌ **${takimAdi}** adında bir takım yok! Mevcutlar: ${Object.keys(db).join(', ')}`);
        }

        // Oyuncuyu listeye ekle
        db[takimAdi].kadro.push({ 
            ad: hedefUye.displayName, 
            id: hedefUye.id, 
            mevki: mevki, 
            bayrak: bayrak 
        });
        
        saveDb();
        message.reply(`✅ **${hedefUye.displayName}** (${bayrak} - ${mevki}) başarıyla **${takimAdi}** kadrosuna eklendi!`);
    }
});

client.login(process.env.TOKEN);
