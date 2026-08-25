'use client';

import { Icon } from '../components/Icons';
import {
  ExerciseModal,
  IntentionModal,
  LabsModal,
  MealModal
} from './modals';
import { PlanEntryScreen } from './plan-entry';
import { MainTabBar, useMainTabNavigation } from './navigation';
import {
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
    logPartnerWalk,
    logWater,
    repeatRecentMeal,
    deleteMeal,
    togglePlanSlot,
    togglePlanSupplement,
    openPlanEntry,
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
    openIntention,
    importData,
    addMeal,
    addExercise,
    saveLabs,
    savePlan,
    saveIntention
  } = useLevelUpApp();

  const { mainRef, navigate } = useMainTabNavigation(screen, setScreen);

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

  const planEntryOpen = modal?.type === 'plan-entry';

  return (
    <div className="app-shell">
      {planEntryOpen ? (
        <PlanEntryScreen
          onClose={() => setModal(null)}
          onSave={savePlan}
        />
      ) : (
        <>
        <main ref={mainRef} className="app-main">
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
            onPartnerWalk={logPartnerWalk}
            onWater={logWater}
            onOpenMeal={openMeal}
            onPlanEntry={openPlanEntry}
            onOpenExercise={() => openExercise()}
            onNavigate={navigate}
          />
        )}
        {screen === 'food' && (
          <FoodView
            state={state}
            today={today}
            todayData={todayData}
            onOpenMeal={openMeal}
            onRepeatMeal={repeatRecentMeal}
            onPlanEntry={openPlanEntry}
            onDeleteMeal={deleteMeal}
            onTogglePlanSlot={togglePlanSlot}
            onTogglePlanSupplement={togglePlanSupplement}
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
            onEditIntention={openIntention}
            onExport={exportData}
            onImport={triggerImport}
            onReset={resetData}
            onSignOut={signOut}
          />
        )}
        </main>

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
      {modal?.type === 'intention' && (
        <IntentionModal
          intention={modal.intention}
          onClose={() => setModal(null)}
          onSave={saveIntention}
        />
      )}
        <MainTabBar screen={screen} onNavigate={navigate} />
        </>
      )}
      <input
        ref={importRef}
        className="visually-hidden"
        type="file"
        accept="application/json,.json"
        onChange={event => importData?.(event.target.files?.[0])}
      />
      {!planEntryOpen && notice && (
        <div className="toast" role="status">
          <span className="toast-icon">
            <Icon name="check" size={16} />
          </span>
          {notice}
        </div>
      )}
    </div>
  );
}
