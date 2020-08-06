/* eslint-env browser */

const colors = {
  regular: {
    blue: "rgb(54,162,236)",
    red: "rgb(255,98,132)",
    white: "rgb(256,256,256)",
  },
  light: {
    blue: "rgba(54,162,236, .8)",
    red: "rgba(255,98,132, .8)",
  },
  lighter: {
    blue: "rgba(54,162,236, .15)",
    red: "rgba(255,98,132, .15)",
  },
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

  el = document.getElementById("toEl");
  el.valueAsDate = new Date();

  el = document.getElementById("fromEl");
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
        // eslint-disable-next-line no-console
        console.error("Unable to get the rows", err);
      });
    return;
  }

  el = document.getElementById("usageEl");
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

  fetch("/db", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user, pwd, host, port }),
  })
    .then(() => fetch(`/stat?from=${from}&to=${to}&usage=${usage}`))
    .then((response) => response.json())
    .then((data) => {
      chart = drawChart(chartType, data.items);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Unable to get the rows", err);
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

  const dataSize = Object.keys(data).length;
  const sum = {
    en: Object.keys(data).reduce((res, key) => res + data[key].en, 0),
    ru: Object.keys(data).reduce((res, key) => res + data[key].ru, 0),
  };

  // eslint-disable-next-line no-undef
  return new Chart(drawer, {
    type: "bar",
    data: {
      labels: Object.keys(data).reduce((res, key) => {
        res.push(data[key].date);
        return res;
      }, []),
      datasets: [
        {
          label: "English chats",
          fill: false,
          data: Object.keys(data).reduce((res, key) => {
            res.push(data[key].en);
            return res;
          }, []),
          borderColor: colors.regular.red,
          backgroundColor: colors.regular.red,
        },
        {
          label: "Russian chats",
          fill: false,
          data: Object.keys(data).reduce((res, key) => {
            res.push(data[key].ru);
            return res;
          }, []),
          borderColor: colors.regular.blue,
          backgroundColor: colors.regular.blue,
        },
      ],
    },
    options: {
      plugins: {
        labels: {
          fontSize: 24,
          fontColor: colors.regular.white,
          render: () => "",
        },
      },
      annotation: {
        annotations: [
          {
            id: "ru-line",
            type: "line",
            mode: "horizontal",
            scaleID: "y-axis-0",
            value: dataSize ? sum.ru / dataSize : 0,
            borderColor: colors.light.blue,
            borderWidth: 2,
            borderDash: [2, 2],
          },
          {
            id: "en-line",
            type: "line",
            mode: "horizontal",
            scaleID: "y-axis-0",
            value: dataSize ? sum.en / dataSize : 0,
            borderColor: colors.light.red,
            borderWidth: 2,
            borderDash: [2, 2],
          },
        ],
      },
      scales: {
        yAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: "# of chats",
            },
          },
        ],
        xAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: "Date",
            },
          },
        ],
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
    { en: 0, ru: 0 }
  );

  // eslint-disable-next-line no-undef
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
    options: {
      plugins: {
        labels: {
          fontSize: 24,
          fontColor: colors.regular.white,
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

  // eslint-disable-next-line no-undef
  return new Chart(drawer, {
    type: "line",
    data: {
      labels: Object.keys(data).reduce((res, key) => {
        res.push(data[key].date);
        return res;
      }, []),
      datasets: [
        {
          label: "# of installs",
          data: Object.keys(data).reduce((res, key) => {
            res.push(data[key].count);
            return res;
          }, []),
          borderColor: colors.regular.blue,
          backgroundColor: colors.lighter.blue,
          trendlineLinear: {
            style: colors.light.red,
            lineStyle: "dotted|solid",
            width: 2,
          },
        },
      ],
    },
    options: {
      scales: {
        yAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: "# of chats",
            },
          },
        ],
        xAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: "Date",
            },
          },
        ],
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
      const lastDayCount =
        (res[currentDayIndex] && res[currentDayIndex].count) || 1;
      currentDayIndex++;
      currentDate = date;

      res[currentDayIndex] = { count: lastDayCount, date };
    }

    return res;
  }, {});

  // eslint-disable-next-line no-undef
  return new Chart(drawer, {
    type: "line",
    data: {
      labels: Object.keys(data).reduce((res, key) => {
        res.push(data[key].date);
        return res;
      }, []),
      datasets: [
        {
          label: "# of installs",
          data: Object.keys(data).reduce((res, key) => {
            res.push(data[key].count);
            return res;
          }, []),
          borderColor: colors.regular.blue,
          backgroundColor: colors.lighter.blue,
          trendlineLinear: {
            style: colors.light.red,
            lineStyle: "dotted|solid",
            width: 2,
          },
        },
      ],
    },
    options: {
      scales: {
        yAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: "# of chats",
            },
          },
        ],
        xAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: "Date",
            },
          },
        ],
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
    { installs: 0, usages: 0 }
  );
  const percentage = Math.floor((data.usages * 100) / data.installs);

  // eslint-disable-next-line no-undef
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
    options: {
      plugins: {
        labels: {
          fontSize: 24,
          fontColor: colors.regular.white,
          render: "value",
        },
        doughnutlabel: {
          labels: [
            {
              text: `${percentage}%`,
              font: {
                size: "60",
              },
            },
          ],
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
    { direct: 0, group: 0 }
  );

  // eslint-disable-next-line no-undef
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
    options: {
      plugins: {
        labels: {
          fontSize: 24,
          fontColor: colors.regular.white,
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
    { direct: 0, group: 0 }
  );

  // eslint-disable-next-line no-undef
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
    options: {
      plugins: {
        labels: {
          fontSize: 24,
          fontColor: colors.regular.white,
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
      // eslint-disable-next-line no-console
      console.error("Unknown chart type", type);
  }
};

window.addEventListener("DOMContentLoaded", () => onReset());
