export function bindAlertTimes(context) {
  const {
    controls,
    getSettings,
    setSettings,
    selectedLeads
  } = context;

  controls.alarmEnabled.onchange = () => {
    setSettings(
      { alarmEnabled: controls.alarmEnabled.checked },
      { quiet: true }
    );
  };

  controls.atTarget.onchange = () => {
    setSettings(
      { atTarget: controls.atTarget.checked },
      { quiet: true }
    );
  };

  controls.leadPresets.forEach(input => {
    input.onchange = () => {
      setSettings({ leadTimes: selectedLeads() }, { quiet: true });
    };
  });

  controls.addLead.onclick = () => {
    const minutes = Math.round(Number(controls.customLead.value));
    if (!(minutes >= 1 && minutes <= 1440)) {
      controls.customLead.focus();
      return;
    }

    setSettings(
      { leadTimes: [...getSettings().leadTimes, minutes] },
      { quiet: true }
    );
    controls.customLead.value = "";
  };

  controls.customLead.onkeydown = event => {
    if (event.key === "Enter") {
      event.preventDefault();
      controls.addLead.click();
    }
  };
}
