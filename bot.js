import { Telegraf, Markup } from "telegraf";
import fetch from "node-fetch";

// === Настройки ===
const TELEGRAM_TOKEN = "7763286167:AAFftKWBw7-ru7SGOdKD8oYUP-IXeQq_AKM"; // токен BotFather
const CLIENT_ID = "2z1waD-HkKPAaUiJiv1862UGVkFV9WlfxwloqGZ0QUY";
const CLIENT_SECRET = "XatRJjQjw8QZlpBmlLA4Blx7Swm-wRpxg8e2zYY4QEg";

// === Создание бота ===
const bot = new Telegraf(TELEGRAM_TOKEN);

// === Объект с курсами ===
const courses = {
  259562: "Основы Python (онлайн)",
  258736: "Основы программирования на Python в задачах информационной безопасности",
  258735: "Олимпиадное программирование на C++",
  258733: "Основы Python",
  258624: "Бухгалтер"
};

// === Получение токена Teachbase ===
async function getToken() {
  const resp = await fetch("https://go.teachbase.ru/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials",
      scope: "public",
    }),
  });
  const data = await resp.json();
  return data.access_token;
}

// === Получение статистики заданий для конкретного курса ===
async function getTaskStatsPage(token, courseId, page) {
  const url = `https://go.teachbase.ru/endpoint/v1/courses/${courseId}/task_stats?per_page=100&page=${page}`;

  const resp = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await resp.json();
  return data;
}

// === Получение всех данных с 20 страниц ===
async function getAllTaskStats(token, courseId) {
  let allTasks = [];
  for (let page = 1; page <= 20; page++) {
    const tasks = await getTaskStatsPage(token, courseId, page);
    if (Array.isArray(tasks) && tasks.length > 0) {
      allTasks = allTasks.concat(tasks);
    } else {
      break; // если страница пустая — выходим
    }
  }
  return allTasks;
}

// === Подсчёт unchecked заданий ===
function countUnchecked(tasks) {
  if (!Array.isArray(tasks)) return 0;
  return tasks.filter((t) => t.checked === false).length;
}

// === Создание клавиатуры с курсами ===
function createCoursesKeyboard() {
  const buttons = Object.entries(courses).map(([id, name]) => 
    Markup.button.callback(name, `course_${id}`)
  );
  
  return Markup.inlineKeyboard(buttons, { columns: 1 });
}

// === Команда /start ===
bot.start((ctx) => {
  const keyboard = createCoursesKeyboard();
  ctx.reply(
    "Выберите курс чтобы посмотреть количество непроверенных заданий:",
    keyboard
  );
});

// === Обработка нажатий на кнопки курсов ===
bot.action(/course_(\d+)/, async (ctx) => {
  try {
    const courseId = ctx.match[1];
    const courseName = courses[courseId];
    
    // Удаляем кнопки и показываем "Загрузка..."
    await ctx.editMessageText("Загрузка...", { reply_markup: { inline_keyboard: [] } });
    
    // Показываем уведомление о загрузке
    await ctx.answerCbQuery(`Загружаем данные для ${courseName}...`);
    
    const token = await getToken();
    if (!token) {
      await ctx.editMessageText("❌ Не удалось получить токен Teachbase");
      return;
    }

    const allTasks = await getAllTaskStats(token, courseId);
    const uncheckedCount = countUnchecked(allTasks);

    await ctx.editMessageText(
      `📊 Курс: ${courseName}\nНепроверенных заданий: ${uncheckedCount}`,
      Markup.inlineKeyboard([
        Markup.button.callback('◀️ Выбрать другой курс', 'back_to_courses')
      ])
    );
  } catch (err) {
    console.error(err);
    await ctx.answerCbQuery("Ошибка при загрузке данных");
    await ctx.editMessageText("Ошибка: " + err.message);
  }
});

// === Обработка кнопки "Назад к курсам" ===
bot.action('back_to_courses', async (ctx) => {
  const keyboard = createCoursesKeyboard();
  await ctx.editMessageText(
    "Выберите курс чтобы посмотреть количество непроверенных заданий:",
    keyboard
  );
});

// === Команда /unchecked (альтернатива) ===
bot.command("unchecked", (ctx) => {
  const keyboard = createCoursesKeyboard();
  ctx.reply(
    "Выберите курс чтобы посмотреть количество непроверенных заданий:",
    keyboard
  );
});

// === Запуск бота ===
bot.launch();
console.log("🤖 Бот запущен!");