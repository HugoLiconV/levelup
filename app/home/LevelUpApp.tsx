'use client';

import { Icon } from '../components/Icons';
import {
  ExerciseModal,
  IntentionModal,
  LabsModal,
  MealModal,
  NutritionModal
} from './modals';
import {
  BottomNav,
  FoodView,
  MoveView,
  MoreView,
  ProgressView,
  TodayView
} from './screens';
import { useLevelUpApp } from './useLevelUpApp';

export default function LevelUpApp() {
  const {
    ready,
    state,
    screen,
    setScreen,
    modal,
    setModal,
    notice,
    timerEndsAt,
    timerMinutes,
    notificationPermission,
    notificationSupported,
    notificationBusy,
    importRef,
    today,
    todayData,
    journeyStatus,
    journeyDay,
    weeklyStats,
    momentum,
    totalXp,
    level,
    logMovementBreak,
    logOmega,
    logPartnerWalk,
    logWater,
    repeatRecentMeal,
    deleteMeal,
    updateSettings,
    toggleReminders,
    updateReminderTime,
    unsubscribeNotifications,
    startTimer,
    saveReflection,
    exportData,
    triggerImport,
    resetData,
    signOut,
    openMeal,
    openExercise,
    openLabs,
    openNutrition,
    openIntention,
    importData,
    addMeal,
    addExercise,
    saveLabs,
    saveNutritionPlan,
    saveIntention
  } = useLevelUpApp();

  if (!ready) {
    return (
      <main className="loading-screen">
        <div className="brand-lockup">
          <span className="brand-mark">
            <Icon name="sparkles" size={18} />
          </span>
          <span>levelup</span>
        </div>
        <div className="loading-line" />
      </main>
    );
  }

  return (
    <div className="app-shell">
      <main className="app-main">
        {screen === 'today' && (
          <TodayView
            state={state}
            today={today}
            journeyStatus={journeyStatus}
            journeyDay={journeyDay}
            todayData={todayData}
            weeklyStats={weeklyStats}
            momentum={momentum}
            totalXp={totalXp}
            onMove={logMovementBreak}
            onOmega={logOmega}
            onPartnerWalk={logPartnerWalk}
            onWater={logWater}
            onOpenMeal={openMeal}
            onOpenExercise={() => openExercise()}
            onNavigate={setScreen}
          />
        )}
        {screen === 'food' && (
          <FoodView
            state={state}
            today={today}
            todayData={todayData}
            onOpenMeal={openMeal}
            onRepeatMeal={repeatRecentMeal}
            onNutrition={openNutrition}
            onDeleteMeal={deleteMeal}
            onWater={logWater}
          />
        )}
        {screen === 'move' && (
          <MoveView
            state={state}
            todayData={todayData}
            weeklyStats={weeklyStats}
            timerMinutes={timerMinutes}
            timerActive={Boolean(timerEndsAt && timerMinutes > 0)}
            onMove={logMovementBreak}
            onStartTimer={startTimer}
            onOpenExercise={openExercise}
          />
        )}
        {screen === 'progress' && (
          <ProgressView
            state={state}
            today={today}
            journeyDay={journeyDay}
            journeyStatus={journeyStatus}
            weeklyStats={weeklyStats}
            momentum={momentum}
            totalXp={totalXp}
            level={level}
            onOpenLabs={openLabs}
            onSaveReflection={saveReflection}
          />
        )}
        {screen === 'more' && (
          <MoreView
            state={state}
            onSettingsChange={updateSettings}
            onToggleReminders={toggleReminders}
            onReminderTimeChange={updateReminderTime}
            onUnsubscribeNotifications={unsubscribeNotifications}
            notificationPermission={notificationPermission}
            notificationSupported={notificationSupported}
            notificationBusy={notificationBusy}
            onOpenNutrition={openNutrition}
            onEditIntention={openIntention}
            onExport={exportData}
            onImport={triggerImport}
            onReset={resetData}
            onSignOut={signOut}
          />
        )}
      </main>

      <input
        ref={importRef}
        className="visually-hidden"
        type="file"
        accept="application/json,.json"
        onChange={event => importData?.(event.target.files?.[0])}
      />
      <BottomNav screen={screen} onNavigate={setScreen} />
      {notice && (
        <div className="toast" role="status">
          <span className="toast-icon">
            <Icon name="check" size={16} />
          </span>
          {notice}
        </div>
      )}

      {modal?.type === 'meal' && (
        <MealModal
          meal={modal.meal}
          onClose={() => setModal(null)}
          onSave={addMeal}
        />
      )}
      {modal?.type === 'exercise' && (
        <ExerciseModal
          preset={modal.preset}
          onClose={() => setModal(null)}
          onSave={addExercise}
        />
      )}
      {modal?.type === 'labs' && (
        <LabsModal
          checkpoint={modal.checkpoint}
          baseline={state.labs.find(lab => lab.id === 'baseline')}
          onClose={() => setModal(null)}
          onSave={saveLabs}
        />
      )}
      {modal?.type === 'nutrition' && (
        <NutritionModal
          plan={state.nutritionPlan}
          onClose={() => setModal(null)}
          onSave={saveNutritionPlan}
        />
      )}
      {modal?.type === 'intention' && (
        <IntentionModal
          intention={modal.intention}
          onClose={() => setModal(null)}
          onSave={saveIntention}
        />
      )}
    </div>
  );
}
