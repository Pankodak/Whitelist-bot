"use strict";
const converter = require("hex2dec");
const Discord = require(`discord.js`);
const cfg = require(`./config.json`);
let mysql = require("mysql");

const bot = new Discord.Client({
    disableEveryone: true,
});
const wb = new Discord.WebhookClient(
    cfg.webhooks.logs.id,
    cfg.webhooks.logs.token
);
const wbaccepted = new Discord.WebhookClient(
    cfg.webhooks.accepted.id,
    cfg.webhooks.accepted.token
);
const wbrejected = new Discord.WebhookClient(
    cfg.webhooks.rejected.id,
    cfg.webhooks.rejected.token
);

let con1info = {
    connectionLimit: 10,
    host: cfg.mysql.applications.host,
    user: cfg.mysql.applications.user,
    password: cfg.mysql.applications.password,
    database: cfg.mysql.applications.database,
    debug: false,
};

let con2info = {
    connectionLimit: 10,
    host: cfg.mysql.server.host,
    user: cfg.mysql.server.user,
    password: cfg.mysql.server.password,
    database: cfg.mysql.server.database,
    debug: false,
};
let guildID = cfg.guildId;

let loop = false;
let con1 = mysql.createPool(con1info);
let con2 = mysql.createPool(con2info);

bot.on("ready", () => {
    bot.user.setActivity("Sprawdzam paszporty, napisz do mnie !status", {
        type: "WATCHING",
    });
    setInterval(() => {
        bot.user.setActivity("Sprawdzam paszporty, napisz do mnie !status", {
            type: "WATCHING",
        });
    }, 3600 * 1000);
});

bot.on(`ready`, async () => {
    loop = true;
    wb.send(`Bot został uruchomiony (Sprawdzanie: ${loop})`);
    console.log(`Bot został uruchomiony (Sprawdzanie: ${loop})`);
    setInterval(() => {
        try {
            if (loop == true) {
                con1.getConnection((err, connection) => {
                    connection.release();
                    if (err) {
                        wb.send(
                            `Wystąpił błąd z bazą danych (Podania WL): ${err}`
                        );
                        return console.log(err);
                    }

                    // waiting

                    connection.query(
                        `SELECT * FROM applications WHERE \`discord_status\` = 'waiting'`,
                        (error, result, fields) => {
                            if (error) {
                                wb.send(
                                    `Wystąpił błąd z bazą danych (Podania WL): ${error}`
                                );
                                return console.log(
                                    "Cannot establish a connection with the database.  (" +
                                        error.code +
                                        ")"
                                );
                            }
                            result.forEach((data) => {
                                connection.query(
                                    "UPDATE applications SET `discord_status` = null WHERE `id` = '" +
                                        data.id +
                                        "'",
                                    () => {
                                        if (bot.users.get(data["discord_id"])) {
                                            let richembed =
                                                new Discord.RichEmbed()
                                                    .setAuthor(
                                                        "Aplikacja Whitelist - Bot",
                                                        bot.user
                                                            .displayAvatarURL
                                                    )
                                                    .setTitle(
                                                        "Twoje podanie zostało zweryfikowane! Teraz oczekuję na rozpatrzenie."
                                                    )
                                                    .setFooter(
                                                        bot.user.username,
                                                        bot.user
                                                            .displayAvatarURL
                                                    )
                                                    .setTimestamp()
                                                    .setThumbnail(
                                                        bot.users.get(
                                                            data["discord_id"]
                                                        ).displayAvatarURL
                                                    )
                                                    .setColor("#4286f4")
                                                    .addField(
                                                        "Kiedy moje podanie zostanie rozpatrzone?",
                                                        "Podania są sprawdzane codziennie. Maksymalny czas oczekiwania na wynosi 7 dni."
                                                    )
                                                    .addField(
                                                        "Czy dostanę wiadomość o statucie mojego podania?",
                                                        "Dostaniesz w wiadomości prywatnej."
                                                    );
                                            try {
                                                bot.users
                                                    .get(data["discord_id"])
                                                    .send(richembed);
                                            } catch (error) {
                                                wb.sendMessage(
                                                    `Nie można wysłać wiadomości do ID: ${data["discord_id"]}`
                                                );
                                            }
                                        }
                                    }
                                );
                            });
                        }
                    );

                    // accepted application

                    connection.query(
                        `SELECT * FROM \`applications\` WHERE \`discord_status\`='accepted'`,
                        (error, result, _) => {
                            if (error) {
                                wb.send(
                                    `Wystąpił błąd z bazą danych (Podania WL): ${error}`
                                );
                                return console.log(
                                    "/!\\ Cannot establish a connection with the database. /!\\ (" +
                                        error.code +
                                        ")"
                                );
                            }

                            result.forEach((data) => {
                                connection.query(
                                    "UPDATE applications SET `discord_status` = null WHERE `id` = '" +
                                        data.id +
                                        "'",
                                    () => {
                                        if (bot.users.get(data["discord_id"])) {
                                            let guild = bot.guilds.find(
                                                "id",
                                                guildID
                                            );
                                            let rule = guild.roles.find(
                                                "name",
                                                cfg.rules.conversation
                                            );

                                            let richembed =
                                                new Discord.RichEmbed()
                                                    .setAuthor(
                                                        "Aplikacja Whitelist - Bot",
                                                        bot.user
                                                            .displayAvatarURL
                                                    )
                                                    .setTitle(
                                                        "Twoje podanie zostało przyjęte!\nPrzed tobą ostatni etap - rozmowa rekrutacyjna."
                                                    )
                                                    .setDescription(
                                                        "Będziesz pytany/a z pojęć obowiązujących na serwerze oraz z regulaminu.\nGdy będziesz gotowy/a wejdź na kanał rekrutacyjny."
                                                    )
                                                    .setFooter(
                                                        bot.user.username,
                                                        bot.user
                                                            .displayAvatarURL
                                                    )
                                                    .setTimestamp()
                                                    .setThumbnail(
                                                        bot.users.get(
                                                            data["discord_id"]
                                                        ).displayAvatarURL
                                                    )
                                                    .setColor("#3aad53");
                                            wbaccepted.send(
                                                `:white_check_mark: ${bot.users.get(
                                                    data["discord_id"]
                                                )}`
                                            );
                                            guild.members
                                                .get(data["discord_id"])
                                                .addRole(rule)
                                                .then(() => {
                                                    try {
                                                        bot.users
                                                            .get(
                                                                data[
                                                                    "discord_id"
                                                                ]
                                                            )
                                                            .send(richembed);
                                                    } catch (error) {
                                                        wb.sendMessage(
                                                            `Nie można wysłać wiadomości do ID: ${data["discord_id"]}`
                                                        );
                                                    }
                                                });
                                        }
                                    }
                                );
                            });
                        }
                    );

                    // rejected application

                    connection.query(
                        "SELECT * FROM applications WHERE `discord_status` = 'rejected'",
                        (error, result, _) => {
                            if (error) {
                                wb.send(
                                    `Wystąpił błąd z bazą danych (Podania WL): ${error}`
                                );
                                return console.log(
                                    "/!\\ Cannot establish a connection with the database. /!\\ (" +
                                        error.code +
                                        ")"
                                );
                            }
                            result.forEach((data) => {
                                connection.query(
                                    "UPDATE applications SET `discord_status` = null WHERE `id` = '" +
                                        data.id +
                                        "'",
                                    () => {
                                        if (bot.users.get(data["discord_id"])) {
                                            let richembed =
                                                new Discord.RichEmbed()
                                                    .setAuthor(
                                                        "Aplikacja Whitelist - Bot",
                                                        bot.user
                                                            .displayAvatarURL
                                                    )
                                                    .setTitle(
                                                        "Twoje podanie zostało odrzucone!"
                                                    )
                                                    .setDescription(
                                                        "Możliwe przyczyny odrzucenia twojego podania:\n- Krótka aplikacja\n- Mało kreatywne podanie\n- Nieciekawa historia postaci\n- Złe odegranie akcji RP w podanych sytuacjach \n- Niepoprawne SteamID64\n- Niepoprawny link do forum\n- Masz mniej niż 16 lat\n\nPo upływie 3 dni od otrzymania tej wiadomości, uzyskasz możliwość ponownej aplikacji."
                                                    )
                                                    .setFooter(
                                                        bot.user.username,
                                                        bot.user
                                                            .displayAvatarURL
                                                    )
                                                    .setTimestamp()
                                                    .setThumbnail(
                                                        bot.users.get(
                                                            data["discord_id"]
                                                        ).displayAvatarURL
                                                    )
                                                    .setColor("#ff002a");
                                            // wbrejected.send(`:x: ${bot.users.get(data['discord_id'])}`);
                                            try {
                                                bot.users
                                                    .get(data["discord_id"])
                                                    .send(richembed);
                                            } catch (error) {
                                                wb.sendMessage(
                                                    `Nie można wysłać wiadomości do ID: ${data["discord_id"]}`
                                                );
                                            }
                                        }
                                    }
                                );
                            });
                        }
                    );

                    // accepted-conversation

                    connection.query(
                        `SELECT * FROM applications WHERE \`discord_status\` = 'accepted-conversation'`,
                        (error, result, _) => {
                            if (error) {
                                wb.send(
                                    `Wystąpił błąd z bazą danych (Podania WL): ${error}`
                                );
                                return console.log(
                                    `Wystąpił błąd z bazą danych (Podania WL): ${error}`
                                );
                            }

                            result.forEach((data) => {
                                connection.query(
                                    "UPDATE applications SET `discord_status` = null WHERE `id` = '" +
                                        data.id +
                                        "'",
                                    () => {
                                        con2.getConnection(
                                            (err1, connection1) => {
                                                connection1.release();
                                                if (err1) {
                                                    wb.send(
                                                        `Wystąpił błąd z bazą danych (Whitelista): ${err1}`
                                                    );
                                                    return console.log(err1);
                                                }
                                                connection1.query(
                                                    "INSERT INTO whitelistGen (`steamid`, `date`) VALUES ('steam:" +
                                                        converter
                                                            .decToHex(
                                                                JSON.parse(
                                                                    data.questions
                                                                )[0].answer
                                                            )
                                                            .slice(2) +
                                                        "', CURRENT_DATE);",
                                                    (err) => {
                                                        if (err) {
                                                            wb.send(
                                                                `Wystąpił błąd z bazą danych (Whitelista): ${err}`
                                                            );
                                                            console.log(err);
                                                        }
                                                    }
                                                );
                                            }
                                        );
                                        if (bot.users.get(data["discord_id"])) {
                                            let guild = bot.guilds.get(guildID);
                                            let rule = guild.roles.find(
                                                "name",
                                                cfg.rules.whitelist
                                            );
                                            let ruleconwl = guild.roles.find(
                                                "name",
                                                cfg.rules.conversation
                                            );

                                            let richembed =
                                                new Discord.RichEmbed()
                                                    .setAuthor(
                                                        "Aplikacja Whitelist - Bot",
                                                        bot.user
                                                            .displayAvatarURL
                                                    )
                                                    .setTitle(
                                                        "Zdałeś/aś rozmowę rekrutacyjną!"
                                                    )
                                                    .setDescription(
                                                        'Zostałeś/aś dodany/a na whitelistę oraz otrzymałeś/aś rangę **"Obywatel/ka"** na naszym discordzie.\n\nW razie problemów zgłoś się do administratora.'
                                                    )
                                                    .addField(
                                                        "Kiedy otrzymam możliwośc wejścia na serwer?",
                                                        "Po restartcie serwera lub przeładowaniu whitelisty."
                                                    )
                                                    .setFooter(
                                                        bot.user.username,
                                                        bot.user
                                                            .displayAvatarURL
                                                    )
                                                    .setTimestamp()
                                                    .setThumbnail(
                                                        bot.users.get(
                                                            data["discord_id"]
                                                        ).displayAvatarURL
                                                    )
                                                    .setColor("#3aad53");
                                            guild.members
                                                .get(data["discord_id"])
                                                .addRole(rule)
                                                .then(() => {
                                                    guild.members
                                                        .get(data["discord_id"])
                                                        .removeRole(ruleconwl);
                                                    try {
                                                        bot.users
                                                            .get(
                                                                data[
                                                                    "discord_id"
                                                                ]
                                                            )
                                                            .send(richembed);
                                                    } catch (error) {
                                                        wb.sendMessage(
                                                            `Nie można wysłać wiadomości do ID: ${data["discord_id"]}`
                                                        );
                                                    }
                                                });
                                        }
                                    }
                                );
                            });
                        }
                    );

                    // discard-conversation

                    connection.query(
                        `SELECT * FROM applications WHERE \`discord_status\` = 'discard-conversation'`,
                        (error, result, _) => {
                            if (error) {
                                wb.send(
                                    `Wystąpił błąd z bazą danych (Podania WL): ${error}`
                                );
                                return console.log(
                                    "/!\\ Cannot establish a connection with the database. /!\\ (" +
                                        error.code +
                                        ")"
                                );
                            }

                            result.forEach((data) => {
                                connection.query(
                                    "UPDATE applications SET `discord_status` = null WHERE `id` = '" +
                                        data.id +
                                        "'",
                                    () => {
                                        if (bot.users.get(data["discord_id"])) {
                                            let guild = bot.guilds.get(guildID);
                                            let ruleconwl = guild.roles.find(
                                                "name",
                                                cfg.rules.conversation
                                            );

                                            let richembed =
                                                new Discord.RichEmbed()
                                                    .setAuthor(
                                                        "Aplikacja Whitelist - Bot",
                                                        bot.user
                                                            .displayAvatarURL
                                                    )
                                                    .setTitle(
                                                        "Niezdałeś/aś rozmowy rekrutacyjnej!"
                                                    )
                                                    .setDescription(
                                                        "Niestety nie udało ci się zdać rozmowy rekrutacyjnej. Nie ma się co załamywać!\nMożesz jeszcze raz przystąpić do rozmowy rekrutacyjnej pisząc jeszcze raz podanie."
                                                    )
                                                    .addField(
                                                        "Kiedy mogę jeszcze raz napisać podanie?",
                                                        "Po upływie 3 dni od otrzymania tej wiadomości, uzyskasz możliwość ponownej aplikacji."
                                                    )
                                                    .setFooter(
                                                        bot.user.username,
                                                        bot.user
                                                            .displayAvatarURL
                                                    )
                                                    .setTimestamp()
                                                    .setThumbnail(
                                                        bot.users.get(
                                                            data["discord_id"]
                                                        ).displayAvatarURL
                                                    )
                                                    .setColor("#ff002a");
                                            guild.members
                                                .get(data["discord_id"])
                                                .removeRole(ruleconwl)
                                                .then(() => {
                                                    try {
                                                        bot.users
                                                            .get(
                                                                data[
                                                                    "discord_id"
                                                                ]
                                                            )
                                                            .send(richembed);
                                                    } catch (error) {
                                                        wb.sendMessage(
                                                            `Nie można wysłać wiadomości do ID: ${data["discord_id"]}`
                                                        );
                                                    }
                                                });
                                        }
                                    }
                                );
                            });
                        }
                    );
                });
            }
        } catch (error) {
            wb.send(`Wystąpił błąd: ${error}`);
            console.log(error);
        }
    }, 60 * 1000);
});

bot.on("message", async (message) => {
    if (message.author.bot) return;
    if (message.channel.type == "dm") {
        if (message.content.toLowerCase() == "!status") {
            wb.send(
                `${message.author.tag} użył komendy: ${message.content} na pw`
            );
            con1.getConnection((error, connection) => {
                if (error) {
                    return message.author.send(
                        "Wystąpił błąd z połączeniem się do bazy danych. Poinformuj o tym administrację. ;)"
                    );
                }
                connection.query(
                    "SELECT * FROM `applications` WHERE `discord_id`='" +
                        message.author.id +
                        "';",
                    (err, result) => {
                        if (err) {
                            return message.reply(`Wystąpił błąd: ${err}`);
                        }
                        if (result.length == 0) {
                            // return message.reply(`Nie znaleziono twojego podania`);
                            const embed = new Discord.RichEmbed()
                                .setAuthor(
                                    "Aplikacja Whitelist",
                                    bot.user.displayAvatarURL
                                )
                                .setDescription(
                                    "Nie znaleziono twojego podania"
                                )
                                .setFooter(
                                    bot.user.username,
                                    bot.user.displayAvatarURL
                                )
                                .setTimestamp()
                                .setThumbnail(message.author.displayAvatarURL)
                                .setColor("#ff002a");
                            return message.reply(embed);
                        } else {
                            let statusapp;
                            if (result[0].status == "waiting") {
                                statusapp = "Oczekujące na sprawdzenie";
                            } else if (result[0].status == "accepted") {
                                statusapp = "Przyjęte";
                            } else if (result[0].status == "rejected") {
                                statusapp = "Odrzucone";
                            } else if (result[0].status == "conversation") {
                                statusapp = "Oczekuje na rozmowę rekrutacyjną";
                            } else {
                                statusapp = result[0].status;
                            }

                            const embed = new Discord.RichEmbed()
                                .setAuthor(
                                    "Aplikacja Whitelist",
                                    bot.user.displayAvatarURL
                                )
                                .setDescription(
                                    `Status twojego podania: ${statusapp}`
                                )
                                .setFooter(
                                    bot.user.username,
                                    bot.user.displayAvatarURL
                                )
                                .setTimestamp()
                                .setThumbnail(message.author.displayAvatarURL)
                                .setColor("#008000");

                            return message.reply(embed);
                        }
                    }
                );
            });
        }
    }
    if (message.channel.type == "dm") return;

    let prefix = cfg.cmds.prefix;
    let messageArray = message.content.split(" ");
    let cmd = messageArray[0];
    let args = messageArray.slice(1);

    if (!cmd.startsWith(prefix)) return;

    if (cmd == `${prefix}sprawdzanie`) {
        if (message.member.roles.some((r) => ["ADMIN"].includes(r.name))) {
            wb.send(`${message.author.tag} użył komendy: ${message.content}`);
            if (args[0] == "on") {
                if (loop == true)
                    return message.reply(`Sprawdzanie jest już włączone.`);
                loop = true;
                return message.reply(`Sprawdzanie włączone.`);
            } else if (args[0] == "off") {
                if (loop == false)
                    return message.reply(`Sprawdzanie jest już wyłączone.`);
                loop = false;
                return message.reply(`Sprawdzanie wyłączone`);
            } else if (args[0] == "status") {
                return message.reply(
                    `Sprawdzanie: ${loop == true ? "włączone" : "wyłączone"}`
                );
            } else {
                return message.reply(`${cmd} on/off/status`);
            }
        }
    }
    if (cmd == `${prefix}hex`) {
        if (message.member.roles.some((r) => ["ADMIN"].includes(r.name))) {
            wb.send(`${message.author.tag} użył komendy: ${message.content}`);
            if (!args[0]) return message.reply(`${cmd} SteamID64...`);
            let dth = [];
            for (let i = 0; i < args.length; i++) {
                dth.push(`${converter.decToHex(args[i]).slice(2)}`);
            }
            return message.reply(`${dth.join(" ").toString()}`);
        }
    }
    if (cmd == `${prefix}sprawdz`) {
        if (
            message.member.roles.some((r) =>
                ["ADMIN", "MODERATOR", "HELPER"].includes(r.name)
            )
        ) {
            wb.send(`${message.author.tag} użył komendy: ${message.content}`);
            let user = message.guild.member(
                message.mentions.users.first() ||
                    message.guild.members.get(args[0])
            );
            if (!user) return message.reply(`${cmd} @user#id`);

            con1.getConnection((error, connection) => {
                if (error) {
                    return message.reply(`Wystąpił błąd: ${err}`);
                }
                connection.query(
                    "SELECT * FROM `applications` WHERE `discord_id`='" +
                        user.user.id +
                        "';",
                    (err, result) => {
                        if (err) {
                            return message.reply(`Wystąpił błąd: ${err}`);
                        }
                        if (result.length == 0) {
                            return message.reply(
                                `Nie znaleziono podania od ${user.user.username}`
                            );
                        } else {
                            let statusapp;
                            if (result[0].status == "waiting") {
                                statusapp =
                                    "ma podanie oczekujące na sprawdzenie";
                            } else if (result[0].status == "accepted") {
                                statusapp = "ma podanie przyjęte";
                            } else if (result[0].status == "rejected") {
                                statusapp = "ma podanie odrzucone";
                            } else if (result[0].status == "conversation") {
                                statusapp = "oczekuje na rozmowę";
                            } else {
                                statusapp = result[0].status;
                            }
                            return message.reply(
                                `${user.user.tag} ${statusapp}`
                            );
                        }
                    }
                );
            });
        }
    }
    if (cmd == `${prefix}addwl`) {
        if (message.member.roles.some((r) => ["ADMIN"].includes(r.name))) {
            wb.send(`${message.author.tag} użył komendy: ${message.content}`);
            if (!args[0]) return message.reply(`${cmd} SteamID64`);
            con2.getConnection((error, connection) => {
                if (error) {
                    wb.send(
                        `Wystąpił błąd z bazą danych (Podania WL): ${error}`
                    );
                    return message.reply(
                        `Wystąpił błąd z bazą danych (Podania WL): ${error}`
                    );
                }
                connection.query(
                    "INSERT INTO whitelistGen (`steamid`, `date`) VALUES ('steam:" +
                        converter.decToHex(`${args[0]}`).slice(2) +
                        "', CURRENT_DATE);",
                    (err) => {
                        if (err) {
                            wb.send(
                                `Wystąpił błąd z bazą danych (Podania WL): ${err}`
                            );
                            return message.reply(
                                `Wystąpił błąd z bazą danych (Podania WL): ${err}`
                            );
                        }
                        wb.send(
                            `${message.author.tag} dodał ${args[0]} (${converter
                                .decToHex(`${args[0]}`)
                                .slice(2)}) na whitelistę!`
                        );
                        return message.reply(
                            `Dodano ${args[0]} (${converter
                                .decToHex(`${args[0]}`)
                                .slice(2)}) na whitelistę!`
                        );
                    }
                );
            });
        }
    }
    if (cmd == `${prefix}removewl`) {
        if (message.member.roles.some((r) => ["ADMIN"].includes(r.name))) {
            wb.send(`${message.author.tag} użył komendy: ${message.content}`);
            if (!args[0]) return message.reply(`${cmd} SteamID64`);
            con2.getConnection((error, connection) => {
                if (error) {
                    wb.send(
                        `Wystąpił błąd z bazą danych (Podania WL): ${error}`
                    );
                    return message.reply(
                        `Wystąpił błąd z bazą danych (Podania WL): ${error}`
                    );
                }
                connection.query(
                    "DELETE FROM  whitelistGen WHERE steamid = 'steam:" +
                        converter.decToHex(`${args[0]}`).slice(2) +
                        "';",
                    (err) => {
                        if (err) {
                            wb.send(
                                `Wystąpił błąd z bazą danych (Podania WL): ${err}`
                            );
                            return message.reply(
                                `Wystąpił błąd z bazą danych (Podania WL): ${err}`
                            );
                        }
                        wb.send(
                            `${message.author.tag} usunął ${
                                args[0]
                            } (${converter
                                .decToHex(`${args[0]}`)
                                .slice(2)}) z wl!`
                        );
                        return message.reply(
                            `Usunięto ${args[0]} (${converter
                                .decToHex(`${args[0]}`)
                                .slice(2)}) z wl!`
                        );
                    }
                );
            });
        }
    }
});

bot.login(cfg.token);
