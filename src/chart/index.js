/* eslint-env browser */

// TODO optimize if too many items in the array

import {
  Chart,
  registerables,
} from "https://cdn.jsdelivr.net/npm/chart.js@4.3.0/+esm";
import TrendlinePlugin from "https://cdn.jsdelivr.net/npm/chartjs-plugin-trendline@2.0.3/+esm";
import LabelsPlugin from "https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/+esm";

Chart.register(...registerables);

const DoughnutLabelPlugin = {
  id: "doughnutlabel",
  beforeDatasetsDraw(chart, args, opts) {
    const { ctx } = chart;
    ctx.save();
    const xCoord = chart.getDatasetMeta(0).data[0].x;
    const yCoord = chart.getDatasetMeta(0).data[0].y;

    const fontSize = opts.font.size || "60";
    const fontColor = opts.font.color;
    if (fontColor) {
      ctx.fillStyle = fontColor;
    }
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(opts.label, xCoord, yCoord);
  },
};

const TrendLinePlugin = {
  id: "trendline",
  afterDatasetsDraw(chart, args, opts) {
    const { ctx, chartArea, scales } = chart;
    const { left, right } = chartArea;
    ctx.save();

    const lines = opts.lines;

    lines.forEach((line) => {
      ctx.beginPath();
      ctx.lineWidth = line.lineWidth || 2;
      ctx.strokeStyle = line.color;
      ctx.setLineDash([2, 2]);
      const yPos = scales.y.getPixelForValue(line.value);
      ctx.moveTo(left, yPos);
      ctx.lineTo(right, yPos);
      ctx.stroke();
    });
  },
};

const percentageFormatter = (value, context) => {
  const allValues = context.chart.data.datasets[0].data;
  const sum = allValues.reduce((res, num) => res + num, 0);
  const percentage = sum ? Math.round((value * 100) / sum) : 0;
  return `${percentage}%`;
};

const colors = {
  regular: {
    blue: "rgb(54, 162, 236)",
    red: "rgb(255, 98, 132)",
    white: "rgb(256, 256, 256)",
    grey: "rgb(102, 102, 102)",
  },
  light: {
    blue: "rgba(54, 162, 236, .8)",
    red: "rgba(255, 98, 132, .8)",
  },
  lighter: {
    blue: "rgba(54, 162, 236, .15)",
    red: "rgba(255, 98, 132, .15)",
  },
};

const printError = (err, ...args) => {
  // eslint-disable-next-line no-console
  console.error(err, ...args);
};

let chart = null;

class DataModel {
  constructor(item) {
    this.chatId = item.chat_id || item.chatId;
    this.langId = item.lang_id || item.langId;
    this.createdAt = new Date(item.created_at || item.createdAt);
    this.updatedAt = new Date(item.updated_at || item.updatedAt);
    this.usageCount = item.usage_count || item.usageCount || 0;
  }

  getDateString(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const dayStr = day < 10 ? `0${day}` : day.toString();
    const monthStr = month < 10 ? `0${month}` : month.toString();
    return `${dayStr}.${monthStr}`;
  }
}

const onFileSelect = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.results) {
          reject(new Error("No results in data.results"));
        }
        resolve({
          items: data.results,
          total: data.results.length,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
};

const onReset = () => {
  let el = document.getElementById("typeEl");
  el.value = "language";

  el = document.getElementById("usageEl");
  el.value = 0;

  el = document.getElementById("fromEl");
  el.valueAsDate = new Date();

  el = document.getElementById("toEl");
  el.valueAsDate = new Date();

  el = document.getElementById("legacyEl");
  el.checked = false;

  el = document.getElementById("pgUser");
  el.value = "";

  el = document.getElementById("pgPwd");
  el.value = "";

  el = document.getElementById("pgHost");
  el.value = "rogue.db.elephantsql.com";

  el = document.getElementById("pgPort");
  el.value = 5432;

  clearDrawer();
  switchMethod();
};

const getForm = () => {
  let el = document.getElementById("usageEl");
  const usage = el.value;

  el = document.getElementById("toEl");
  const to = el.valueAsDate.getTime();

  el = document.getElementById("fromEl");
  const from = el.valueAsDate.getTime();

  el = document.getElementById("pgUser");
  const user = el.value;

  el = document.getElementById("pgPwd");
  const pwd = el.value;

  el = document.getElementById("pgHost");
  const host = el.value;

  el = document.getElementById("pgPort");
  const port = el.value;

  return {
    usage,
    from,
    to,
    user,
    pwd,
    host,
    port,
  };
};

const onDraw = () => {
  let el = document.getElementById("legacyEl");
  const useFile = el.checked;

  el = document.getElementById("typeEl");
  const chartType = el.value;

  if (useFile) {
    el = document.getElementById("fileEl");
    const file = el.files[0];
    onFileSelect(file)
      .then((data) => {
        chart = drawChart(chartType, data.items);
      })
      .catch((err) => {
        printError(new Error("Unable to get the rows", { cause: err }), err);
      });
    return;
  }

  const { from, to, usage } = getForm();
  fetch(`/stat?from=${from}&to=${to}&usage=${usage}`)
    .then((response) => response.json())
    .then((data) => {
      chart = drawChart(chartType, data.items);
    })
    .catch((err) => {
      printError(new Error("Unable to get the rows", { cause: err }), err);
    });
};

const switchMethod = () => {
  const el = document.getElementById("legacyEl");
  const useFile = el.checked;

  const newOptions = document.getElementById("options");
  const oldOptions = document.getElementById("legacy-options");

  if (useFile) {
    oldOptions.classList.remove("hidden");
    newOptions.classList.add("hidden");
  } else {
    oldOptions.classList.add("hidden");
    newOptions.classList.remove("hidden");
  }
};

const clearDrawer = () => {
  if (chart) {
    chart.destroy();
  }
};

const renderLanguageChart = (drawer, rows) => {
  let currentDate = "";
  let currentDayIndex = 0;

  const data = rows.reduce((res, item) => {
    const date = item.getDateString(item.createdAt);

    const isEn = item.langId === "en-US";
    const forRu = isEn ? 0 : 1;
    const forEn = isEn ? 1 : 0;

    if (date === currentDate) {
      res[currentDayIndex].en += forEn;
      res[currentDayIndex].ru += forRu;
    } else {
      currentDayIndex++;
      currentDate = date;

      res[currentDayIndex] = { en: forEn, ru: forRu, date };
    }

    return res;
  }, {});

  const chartList = Object.values(data);

  const chartLabels = chartList.map((val) => val.date);
  const enData = chartList.map((val) => val.en);
  const ruData = chartList.map((val) => val.ru);

  const chartSize = chartList.length;
  const sum = {
    en: enData.reduce((res, num) => res + num, 0),
    ru: ruData.reduce((res, num) => res + num, 0),
  };

  return new Chart(drawer, {
    type: "bar",
    plugins: [TrendLinePlugin],
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: "English chats",
          fill: false,
          data: enData,
          borderColor: colors.regular.red,
          backgroundColor: colors.regular.red,
        },
        {
          label: "Russian chats",
          fill: false,
          data: ruData,
          borderColor: colors.regular.blue,
          backgroundColor: colors.regular.blue,
        },
      ],
    },
    options: {
      plugins: {
        trendline: {
          lines: [
            {
              value: chartSize ? sum.en / chartSize : 0,
              color: colors.light.red,
              lineWidth: 3,
            },
            {
              value: chartSize ? sum.ru / chartSize : 0,
              color: colors.light.blue,
              lineWidth: 3,
            },
          ],
        },
      },
      scales: {
        y: {
          title: {
            display: true,
            text: "# of chats",
          },
        },
        x: {
          title: {
            display: true,
            text: "Date",
          },
        },
      },
    },
  });
};

const renderTotalLanguagePie = (drawer, rows) => {
  const data = rows.reduce(
    (res, item) => {
      const isEn = item.langId === "en-US";
      const forRu = isEn ? 0 : 1;
      const forEn = isEn ? 1 : 0;
      res.en += forEn;
      res.ru += forRu;

      return res;
    },
    { en: 0, ru: 0 },
  );

  return new Chart(drawer, {
    type: "pie",
    data: {
      labels: ["English chats", "Russian chats"],
      datasets: [
        {
          data: [data.en, data.ru],
          backgroundColor: [colors.regular.red, colors.regular.blue],
        },
      ],
    },
    plugins: [LabelsPlugin],
    options: {
      plugins: {
        datalabels: {
          formatter: percentageFormatter,
          font: {
            size: 24,
          },
          color: colors.regular.white,
        },
      },
    },
  });
};

const renderInstallsChart = (drawer, rows) => {
  let currentDate = "";
  let currentDayIndex = 0;

  const data = rows.reduce((res, item) => {
    const date = item.getDateString(item.createdAt);

    if (date === currentDate) {
      res[currentDayIndex].count++;
    } else {
      currentDayIndex++;
      currentDate = date;

      res[currentDayIndex] = { count: 1, date };
    }

    return res;
  }, {});

  const chartList = Object.values(data);
  const chartLabels = chartList.map((val) => val.date);
  const chartData = chartList.map((val) => val.count);

  return new Chart(drawer, {
    type: "line",
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: "# of installs",
          data: chartData,
          fill: true,
          tension: 0.3,
          borderColor: colors.regular.blue,
          backgroundColor: colors.lighter.blue,
          trendlineLinear: {
            colorMin: colors.light.red,
            colorMax: colors.light.red,
            lineStyle: "dotted",
            width: 3,
          },
        },
      ],
    },
    plugins: [TrendlinePlugin],
    options: {
      scales: {
        y: {
          title: {
            display: true,
            text: "# of installs",
          },
        },
        x: {
          title: {
            display: true,
            text: "Date",
          },
        },
      },
    },
  });
};

const renderInstallsCumulativeChart = (drawer, rows) => {
  let currentDate = "";
  let currentDayIndex = 0;

  const data = rows.reduce((res, item) => {
    const date = item.getDateString(item.createdAt);

    if (date === currentDate) {
      res[currentDayIndex].count++;
    } else {
      const lastDayCount = res?.[currentDayIndex]?.count ?? 1;
      currentDayIndex++;
      currentDate = date;

      res[currentDayIndex] = { count: lastDayCount, date };
    }

    return res;
  }, {});

  const chartList = Object.values(data);
  const chartLabels = chartList.map((val) => val.date);
  const chartData = chartList.map((val) => val.count);

  return new Chart(drawer, {
    type: "line",
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: "# of installs",
          data: chartData,
          fill: true,
          tension: 0.3,
          borderColor: colors.regular.blue,
          backgroundColor: colors.lighter.blue,
          trendlineLinear: {
            colorMin: colors.light.red,
            colorMax: colors.light.red,
            lineStyle: "dotted",
            width: 3,
          },
        },
      ],
    },
    plugins: [TrendlinePlugin],
    options: {
      scales: {
        y: {
          title: {
            display: true,
            text: "# of installs",
          },
        },
        x: {
          title: {
            display: true,
            text: "Date",
          },
        },
      },
    },
  });
};

const renderInstallsUsagesPie = (drawer, rows) => {
  const data = rows.reduce(
    (res, item) => {
      const usedOnce = item.usageCount ? 1 : 0;
      res.installs += 1;
      res.usages += usedOnce;

      return res;
    },
    { installs: 0, usages: 0 },
  );
  const percentage = Math.floor((data.usages * 100) / data.installs);

  return new Chart(drawer, {
    type: "doughnut",
    data: {
      labels: ["Installed", "Used at least once"],
      datasets: [
        {
          data: [data.installs, data.usages],
          backgroundColor: [colors.regular.red, colors.regular.blue],
        },
      ],
    },
    plugins: [DoughnutLabelPlugin, LabelsPlugin],
    options: {
      plugins: {
        datalabels: {
          font: {
            size: 24,
          },
          color: colors.regular.white,
        },
        doughnutlabel: {
          label: `${percentage}%`,
          font: {
            color: colors.regular.grey,
            size: "60",
          },
        },
      },
    },
  });
};

const renderDirectVsGroupsPie = (drawer, rows) => {
  const data = rows.reduce(
    (res, item) => {
      const isDirect = item.chatId > 0;
      const forGroup = isDirect ? 0 : 1;
      const forDirect = isDirect ? 1 : 0;
      res.group += forGroup;
      res.direct += forDirect;

      return res;
    },
    { direct: 0, group: 0 },
  );

  return new Chart(drawer, {
    type: "pie",
    data: {
      labels: ["Direct messages", "Groups and channels"],
      datasets: [
        {
          data: [data.direct, data.group],
          backgroundColor: [colors.regular.red, colors.regular.blue],
        },
      ],
    },
    plugins: [LabelsPlugin],
    options: {
      plugins: {
        datalabels: {
          formatter: percentageFormatter,
          font: {
            size: 24,
          },
          color: colors.regular.white,
        },
      },
    },
  });
};

const renderDirectVsGroupsUsagePie = (drawer, rows) => {
  const data = rows.reduce(
    (res, item) => {
      const isDirect = item.chatId > 0;
      const forGroup = isDirect ? 0 : item.usageCount;
      const forDirect = isDirect ? item.usageCount : 0;
      res.group += forGroup;
      res.direct += forDirect;

      return res;
    },
    { direct: 0, group: 0 },
  );

  return new Chart(drawer, {
    type: "pie",
    data: {
      labels: ["Direct messages", "Groups and channels"],
      datasets: [
        {
          data: [data.direct, data.group],
          backgroundColor: [colors.regular.red, colors.regular.blue],
        },
      ],
    },
    plugins: [LabelsPlugin],
    options: {
      plugins: {
        datalabels: {
          formatter: percentageFormatter,
          font: {
            size: 24,
          },
          color: colors.regular.white,
        },
      },
    },
  });
};

const drawChart = (type, rows) => {
  clearDrawer();

  if (!rows || !Array.isArray(rows) || !rows.length) {
    return;
  }

  const drawer = document.getElementById("chartEl").getContext("2d");
  const items = rows.map((row) => new DataModel(row));

  switch (type) {
    case "language":
      return renderLanguageChart(drawer, items);
    case "language-total":
      return renderTotalLanguagePie(drawer, items);
    case "installs":
      return renderInstallsChart(drawer, items);
    case "installs-cumulative":
      return renderInstallsCumulativeChart(drawer, items);
    case "installs-usages":
      return renderInstallsUsagesPie(drawer, items);
    case "direct-group-install":
      return renderDirectVsGroupsPie(drawer, items);
    case "direct-group-usages":
      return renderDirectVsGroupsUsagePie(drawer, items);
    default:
      printError(new Error("Unknown chart", { cause: { type } }), type);
  }
};

const toggleDbForm = (showForm) => {
  const hideClass = "hidden";
  const dbForm = document.querySelector(".db-form");
  const dbFormBtn = document.querySelector(".db-form-btn");
  const btn = document.querySelector(".form-btn");
  if (showForm) {
    if (dbForm.classList.contains(hideClass)) {
      dbForm.classList.remove(hideClass);
    }
    if (dbFormBtn.classList.contains(hideClass)) {
      dbFormBtn.classList.remove(hideClass);
    }
    if (!btn.classList.contains(hideClass)) {
      btn.classList.add(hideClass);
    }

    return;
  }

  if (!dbForm.classList.contains(hideClass)) {
    dbForm.classList.add(hideClass);
  }
  if (!dbFormBtn.classList.contains(hideClass)) {
    dbFormBtn.classList.add(hideClass);
  }
  if (btn.classList.contains(hideClass)) {
    btn.classList.remove(hideClass);
  }
};
const onDisconnect = () => {
  onReset();
  fetch("/login", {
    method: "DELETE",
  })
    .then(() => {
      toggleDbForm(true);
    })
    .catch((err) => {
      printError(new Error("Failed to disconnect db", { cause: err }), err);
    });
};

const oonConnect = () => {
  onReset();
  const { user, pwd, host, port } = getForm();
  fetch("/login", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user, pwd, host, port }),
  })
    .then(() => {
      toggleDbForm(false);
    })
    .catch((err) => {
      printError(new Error("Unable to connect db", { cause: err }), err);
    });
};

// Attaching event handlers
window.addEventListener("DOMContentLoaded", () => onReset());
document.querySelector(".draw-btn").addEventListener("click", () => onDraw());
document.querySelector(".reset-btn").addEventListener("click", () => onReset());
document
  .querySelector(".off-btn")
  .addEventListener("click", () => onDisconnect());
document.querySelector(".on-btn").addEventListener("click", () => oonConnect());
document
  .querySelector("#legacyEl")
  .addEventListener("change", () => switchMethod());
