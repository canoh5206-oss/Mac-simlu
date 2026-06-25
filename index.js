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

// JSON veritabanını yükle
let db = fs.existsSync('./db.json') ? JSON.parse(fs.readFileSync('./db.json', 'utf8')) : {};
function saveDb() { fs.writeFileSync('./db.json', JSON.stringify(db, null, 2)); }

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const args = message.content.split(' ');
    const komut = args[0];

    // .takimkur Fenerbahçe
    if (komut === '.takimkur') {
        db[args[1]] = { baskan: message.author.id, kadro: [] };
        saveDb();
        message.reply(`✅ **${args[1]}** kuruldu.`);
    }

    // .oyuncuekle Fenerbahçe Forvet 🇲🇫 @etiket
    if (komut === '.oyuncuekle') {
        const takim = args[1], mevki = args[2], bayrak = args[3];
        const uye = message.mentions.members.first();
        if (!db[takim]) return message.reply("❌ Takım bulunamadı!");
        db[takim].kadro.push({ ad: uye.displayName, id: uye.id, mevki, bayrak });
        saveDb();
        message.reply(`✅ ${uye.displayName} (${bayrak} - ${mevki}) ${takim} kadrosuna eklendi.`);
    }

    // .ara 🇲🇫 Forvet
    if (komut === '.ara') {
        const bayrak = args[1];
        const mevki = args[2];
        let sonuc = [];
        for (let t in db) {
            let buldu = db[t].kadro.filter(o => o.bayrak === bayrak && o.mevki === mevki);
            if (buldu.length > 0) sonuc.push(`**${t}**: ${buldu.map(o => o.ad).join(', ')}`);
        }
        message.reply(sonuc.length > 0 ? sonuc.join('\n') : "❌ Bu kriterde oyuncu yok.");
    }
    
    // .kadro Fenerbahçe
    if (komut === '.kadro') {
        const data = db[args[1]];
        if (!data) return message.reply("Takım yok.");
        message.reply(`📋 **${args[1]} Kadrosu:**\n` + data.kadro.map(o => `• ${o.ad} (${o.bayrak} ${o.mevki})`).join('\n'));
    }
});

// Sunucudan çıkan otomatik silinir
client.on('guildMemberRemove', member => {
    for (let t in db) {
        db[t].kadro = db[t].kadro.filter(o => o.id !== member.id);
    }
    saveDb();
});

client.login(process.env.TOKEN);
