import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
  FlatList,
  Modal,
  useWindowDimensions,
  SafeAreaView,
  StatusBar,
  Platform
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import IconMC from 'react-native-vector-icons/MaterialCommunityIcons';
import IconMI from 'react-native-vector-icons/MaterialIcons';
import {
  Provider as PaperProvider,
  Card,
  ProgressBar,
  Button,
  FAB,
  Snackbar,
  SegmentedButtons,
  List,
  Divider,
  Switch,
  DefaultTheme,
  DarkTheme,
  useTheme
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarChart } from 'react-native-chart-kit';
import moment from 'moment';

const Tab = createBottomTabNavigator();

// ============================================
// STORAGE UTILITIES - COMPLETE & ERROR HANDLED
// ============================================

const STORAGE_KEYS = {
  STUDY_LOG: 'studyLog',
  SETTINGS: 'settings',
  THEME: 'theme'
};

const getStudyLog = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.STUDY_LOG);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting study log:', error);
    return [];
  }
};

const saveStudyLog = async (log) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.STUDY_LOG, JSON.stringify(log));
    return true;
  } catch (error) {
    console.error('Error saving study log:', error);
    return false;
  }
};

const saveStudyEntry = async (date, hours) => {
  try {
    const log = await getStudyLog();
    const entryIndex = log.findIndex(e => e.date === date);
    if (entryIndex !== -1) {
      log[entryIndex].hours = hours;
      log[entryIndex].updatedAt = moment().toISOString();
    } else {
      log.push({
        date,
        hours,
        createdAt: moment().toISOString(),
        updatedAt: moment().toISOString()
      });
    }
    await saveStudyLog(log);
    return true;
  } catch (error) {
    console.error('Error saving study entry:', error);
    return false;
  }
};

const deleteStudyEntry = async (date) => {
  try {
    const log = await getStudyLog();
    const filtered = log.filter(e => e.date !== date);
    await saveStudyLog(filtered);
    return true;
  } catch (error) {
    console.error('Error deleting study entry:', error);
    return false;
  }
};

const getSettings = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        goalHours: parsed.goalHours || 500,
        startDate: parsed.startDate || moment().format('YYYY-MM-DD'),
        endDate: parsed.endDate || moment().add(90, 'days').format('YYYY-MM-DD'),
        notifications: parsed.notifications !== undefined ? parsed.notifications : true,
        reminderTime: parsed.reminderTime || '20:00',
      };
    }
    return {
      goalHours: 500,
      startDate: moment().format('YYYY-MM-DD'),
      endDate: moment().add(90, 'days').format('YYYY-MM-DD'),
      notifications: true,
      reminderTime: '20:00',
    };
  } catch (error) {
    console.error('Error getting settings:', error);
    return {
      goalHours: 500,
      startDate: moment().format('YYYY-MM-DD'),
      endDate: moment().add(90, 'days').format('YYYY-MM-DD'),
      notifications: true,
      reminderTime: '20:00',
    };
  }
};

const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
};

const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.STUDY_LOG,
      STORAGE_KEYS.SETTINGS,
      STORAGE_KEYS.THEME
    ]);
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
};

// ============================================
// CUSTOM HOOK FOR STATS CALCULATION
// ============================================

const useStudyStats = () => {
  const [stats, setStats] = useState({
    goalHours: 500,
    totalHours: 0,
    hoursRemaining: 500,
    progress: 0,
    daysElapsed: 0,
    daysRemaining: 0,
    totalDays: 0,
    requiredRate: 0,
    averageRate: 0,
    expectedHours: 0,
    aheadBehind: 0,
    estimatedFinish: null,
    currentStreak: 0,
    longestStreak: 0,
    missedDays: 0,
    totalStudyDays: 0,
    highestDaily: 0,
    lowestDaily: 0,
    weeklyAverage: 0,
    monthlyAverage: 0,
    totalSessions: 0,
    todayHours: 0,
    hasLoggedToday: false
  });
  const [loading, setLoading] = useState(true);

  const calculateStats = useCallback(async () => {
    try {
      setLoading(true);
      const settings = await getSettings();
      const studyLog = await getStudyLog();

      const totalHours = studyLog.reduce((sum, entry) => sum + entry.hours, 0);
      const goalHours = parseFloat(settings.goalHours) || 500;
      const hoursRemaining = Math.max(0, goalHours - totalHours);
      const progress = goalHours > 0 ? (totalHours / goalHours) * 100 : 0;

      const today = moment();
      const startDate = moment(settings.startDate);
      const endDate = moment(settings.endDate);
      const daysElapsed = Math.max(0, today.diff(startDate, 'days') + 1);
      const daysRemaining = Math.max(0, endDate.diff(today, 'days'));
      const totalDays = endDate.diff(startDate, 'days') + 1;

      const requiredRate = daysRemaining > 0 ? hoursRemaining / daysRemaining : 0;
      const averageRate = daysElapsed > 0 ? totalHours / daysElapsed : 0;
      const expectedHours = averageRate * daysElapsed;
      const aheadBehind = totalHours - expectedHours;

      // Calculate streaks
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let missedDays = 0;
      let totalStudyDays = 0;

      const sortedLog = [...studyLog].sort((a, b) => moment(a.date).diff(moment(b.date)));

      for (let i = 0; i < sortedLog.length; i++) {
        const entry = sortedLog[i];
        if (entry.hours > 0) {
          tempStreak++;
          totalStudyDays++;
          if (tempStreak > longestStreak) longestStreak = tempStreak;
        } else {
          missedDays++;
          tempStreak = 0;
        }

        // Check if consecutive days
        if (i > 0) {
          const prevDate = moment(sortedLog[i - 1].date);
          const currDate = moment(entry.date);
          const dayDiff = currDate.diff(prevDate, 'days');
          if (dayDiff > 1) {
            tempStreak = 0;
          }
        }
      }

      // Current streak (from today backwards)
      currentStreak = 0;
      const todayStr = today.format('YYYY-MM-DD');
      const todayEntry = studyLog.find(e => e.date === todayStr);

      if (todayEntry && todayEntry.hours > 0) {
        currentStreak = 1;
        let checkDate = today.clone().subtract(1, 'days');
        while (true) {
          const dateStr = checkDate.format('YYYY-MM-DD');
          const entry = studyLog.find(e => e.date === dateStr);
          if (entry && entry.hours > 0) {
            currentStreak++;
            checkDate.subtract(1, 'days');
          } else {
            break;
          }
        }
      }

      // Statistics
      const hoursArray = studyLog.map(e => e.hours);
      const highestDaily = hoursArray.length > 0 ? Math.max(...hoursArray) : 0;
      const positiveHours = hoursArray.filter(h => h > 0);
      const lowestDaily = positiveHours.length > 0 ? Math.min(...positiveHours) : 0;
      const totalSessions = studyLog.length;

      // Weekly Average (last 7 days)
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = today.clone().subtract(i, 'days').format('YYYY-MM-DD');
        const entry = studyLog.find(e => e.date === date);
        last7Days.push(entry ? entry.hours : 0);
      }
      const weeklyAverage = last7Days.reduce((a, b) => a + b, 0) / 7;

      // Monthly Average (last 30 days)
      const last30Days = [];
      for (let i = 29; i >= 0; i--) {
        const date = today.clone().subtract(i, 'days').format('YYYY-MM-DD');
        const entry = studyLog.find(e => e.date === date);
        last30Days.push(entry ? entry.hours : 0);
      }
      const monthlyAverage = last30Days.reduce((a, b) => a + b, 0) / 30;

      // Estimated finish date
      let estimatedFinish = null;
      if (averageRate > 0 && hoursRemaining > 0) {
        const daysNeeded = hoursRemaining / averageRate;
        estimatedFinish = today.clone().add(daysNeeded, 'days');
      }

      setStats({
        goalHours,
        totalHours,
        hoursRemaining,
        progress,
        daysElapsed,
        daysRemaining,
        totalDays,
        requiredRate,
        averageRate,
        expectedHours,
        aheadBehind,
        estimatedFinish,
        currentStreak,
        longestStreak,
        missedDays,
        totalStudyDays,
        highestDaily,
        lowestDaily,
        weeklyAverage,
        monthlyAverage,
        totalSessions,
        todayHours: todayEntry ? todayEntry.hours : 0,
        hasLoggedToday: !!todayEntry
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    calculateStats();
    const interval = setInterval(calculateStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [calculateStats]);

  return { stats, loading, refreshStats: calculateStats };
};

// ============================================
// DASHBOARD SCREEN - COMPLETE
// ============================================

const Dashboard = ({ navigation }) => {
  const { stats, loading, refreshStats } = useStudyStats();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshStats();
    setRefreshing(false);
  }, [refreshStats]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return moment(date).format('DD MMM YYYY');
  };

  const getMotivationMessage = () => {
    const { currentStreak, progress, aheadBehind } = stats;
    if (progress >= 100) return '🎉🎉🎉 GOAL COMPLETED! Amazing work! 🎉🎉🎉';
    if (currentStreak >= 30) return '🔥🔥 Legendary 30-day streak! You\'re unstoppable! 🔥🔥';
    if (currentStreak >= 14) return '⭐ Incredible 2-week streak! Keep the momentum! ⭐';
    if (currentStreak >= 7) return '💪 One week strong! You\'re building a habit! 💪';
    if (currentStreak >= 3) return '🌟 Great start! Keep the streak alive! 🌟';
    if (aheadBehind >= 0) return '🚀 You\'re ahead of schedule! Keep pushing! 🚀';
    if (aheadBehind < -20) return '⚠️ You\'re falling behind. Time to catch up! ⚠️';
    return '📚 Every hour counts. Keep studying! 📚';
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your progress...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Text style={styles.goalText}>🎯 Goal: {stats.goalHours} Hours</Text>
            <Text style={styles.progressText}>{stats.progress.toFixed(1)}%</Text>
          </View>
          <ProgressBar
            progress={Math.min(stats.progress / 100, 1)}
            color="#FFFFFF"
            style={styles.progressBar}
          />
          <Text style={styles.hoursText}>
            {stats.totalHours.toFixed(1)} / {stats.goalHours} Hours
          </Text>
          {stats.hasLoggedToday && (
            <View style={styles.todayLoggedBadge}>
              <Text style={styles.todayLoggedText}>✅ Logged {stats.todayHours.toFixed(1)}h today</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Motivation Message */}
      <Card style={styles.motivationCard}>
        <Card.Content>
          <Text style={styles.motivationText}>{getMotivationMessage()}</Text>
        </Card.Content>
      </Card>

      {/* Quick Stats Grid */}
      <View style={styles.grid}>
        <Card style={styles.gridCard}>
          <Card.Content>
            <Text style={styles.gridLabel}>⏱️ Hours Remaining</Text>
            <Text style={styles.gridValue}>{stats.hoursRemaining.toFixed(1)}</Text>
          </Card.Content>
        </Card>
        <Card style={styles.gridCard}>
          <Card.Content>
            <Text style={styles.gridLabel}>📅 Days Left</Text>
            <Text style={styles.gridValue}>{stats.daysRemaining}</Text>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.grid}>
        <Card style={[styles.gridCard, { backgroundColor: stats.requiredRate > stats.averageRate ? '#FFF3E0' : '#E8F5E9' }]}>
          <Card.Content>
            <Text style={styles.gridLabel}>📈 Required Rate</Text>
            <Text style={[styles.gridValue, { color: stats.requiredRate > stats.averageRate ? '#FF6B6B' : '#4CAF50' }]}>
              {stats.requiredRate.toFixed(2)} hrs/day
            </Text>
          </Card.Content>
        </Card>
        <Card style={styles.gridCard}>
          <Card.Content>
            <Text style={styles.gridLabel}>📊 Your Average</Text>
            <Text style={styles.gridValue}>{stats.averageRate.toFixed(2)} hrs/day</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Status Card */}
      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.statusRow}>
            <IconMC
              name={stats.aheadBehind >= 0 ? 'trending-up' : 'trending-down'}
              size={28}
              color={stats.aheadBehind >= 0 ? '#4CAF50' : '#FF6B6B'}
            />
            <View style={styles.statusTextContainer}>
              <Text style={[styles.statusText, { color: stats.aheadBehind >= 0 ? '#4CAF50' : '#FF6B6B' }]}>
                {stats.aheadBehind >= 0 ? 'Ahead' : 'Behind'}
              </Text>
              <Text style={styles.statusSubtext}>
                by {Math.abs(stats.aheadBehind).toFixed(1)} hours
              </Text>
            </View>
          </View>
          <View style={styles.estimatedRow}>
            <Text style={styles.estimatedLabel}>🎯 Estimated Finish:</Text>
            <Text style={styles.estimatedValue}>{formatDate(stats.estimatedFinish)}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Streaks */}
      <View style={styles.grid}>
        <Card style={styles.streakCard}>
          <Card.Content>
            <Text style={styles.streakLabel}>🔥 Current Streak</Text>
            <Text style={styles.streakValue}>{stats.currentStreak} days</Text>
          </Card.Content>
        </Card>
        <Card style={styles.streakCard}>
          <Card.Content>
            <Text style={styles.streakLabel}>🏆 Longest Streak</Text>
            <Text style={styles.streakValue}>{stats.longestStreak} days</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Additional Stats */}
      <View style={styles.grid}>
        <Card style={styles.statsSmallCard}>
          <Card.Content>
            <Text style={styles.statsSmallLabel}>📖 Study Days</Text>
            <Text style={styles.statsSmallValue}>{stats.totalStudyDays}</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statsSmallCard}>
          <Card.Content>
            <Text style={styles.statsSmallLabel}>❌ Missed Days</Text>
            <Text style={styles.statsSmallValue}>{stats.missedDays}</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statsSmallCard}>
          <Card.Content>
            <Text style={styles.statsSmallLabel}>📅 Sessions</Text>
            <Text style={styles.statsSmallValue}>{stats.totalSessions}</Text>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.grid}>
        <Card style={styles.statsSmallCard}>
          <Card.Content>
            <Text style={styles.statsSmallLabel}>🏅 Highest Day</Text>
            <Text style={styles.statsSmallValue}>{stats.highestDaily.toFixed(1)}h</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statsSmallCard}>
          <Card.Content>
            <Text style={styles.statsSmallLabel}>📊 Weekly Avg</Text>
            <Text style={styles.statsSmallValue}>{stats.weeklyAverage.toFixed(1)}h</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statsSmallCard}>
          <Card.Content>
            <Text style={styles.statsSmallLabel}>📊 Monthly Avg</Text>
            <Text style={styles.statsSmallValue}>{stats.monthlyAverage.toFixed(1)}h</Text>
          </Card.Content>
        </Card>
      </View>

      {/* FAB Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('Log Study')}
        label="Log Today"
        color="#FFFFFF"
      />
    </ScrollView>
  );
};

// ============================================
// LOG STUDY SCREEN - COMPLETE
// ============================================

const LogStudy = ({ navigation }) => {
  const [hours, setHours] = useState('');
  const [date, setDate] = useState(moment().format('YYYY-MM-DD'));
  const [selectedDate, setSelectedDate] = useState('today');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState('#4CAF50');
  const [todayEntry, setTodayEntry] = useState(null);

  const checkTodayEntry = async () => {
    try {
      const studyLog = await getStudyLog();
      const todayStr = moment().format('YYYY-MM-DD');
      const entry = studyLog.find(e => e.date === todayStr);
      if (entry) {
        setTodayEntry(entry);
        setHours(entry.hours.toString());
      } else {
        setTodayEntry(null);
        setHours('');
      }
    } catch (error) {
      console.error('Error checking today entry:', error);
    }
  };

  useEffect(() => {
    checkTodayEntry();
    const focusListener = navigation.addListener('focus', checkTodayEntry);
    return () => focusListener();
  }, [navigation]);

  const handleSave = async () => {
    const hoursNum = parseFloat(hours);
    if (!hoursNum || hoursNum <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of hours (greater than 0)');
      return;
    }
    if (hoursNum > 24) {
      Alert.alert('Too Many Hours', 'You entered more than 24 hours. Please check your input.');
      return;
    }

    setLoading(true);
    try {
      const success = await saveStudyEntry(date, hoursNum);
      if (success) {
        setSnackbarMessage('✅ Study hours saved successfully!');
        setSnackbarColor('#4CAF50');
        setSnackbarVisible(true);
        setHours('');
        setTodayEntry(null);
        setTimeout(() => {
          navigation.navigate('Dashboard');
        }, 500);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving study hours:', error);
      setSnackbarMessage('❌ Failed to save. Please try again.');
      setSnackbarColor('#FF6B6B');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = (hoursValue) => {
    setHours(hoursValue.toString());
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>📝 Log Today's Study</Text>

            {todayEntry && (
              <View style={styles.todayEntry}>
                <Text style={styles.todayEntryText}>⏰ Already logged {todayEntry.hours.toFixed(1)} hours today</Text>
                <Text style={styles.todayEntrySubtext}>Update below if needed</Text>
              </View>
            )}

            <View style={styles.dateSelector}>
              <TouchableOpacity
                style={[styles.dateButton, selectedDate === 'today' && styles.dateButtonActive]}
                onPress={() => {
                  setSelectedDate('today');
                  setDate(moment().format('YYYY-MM-DD'));
                }}
              >
                <Text style={[styles.dateButtonText, selectedDate === 'today' && styles.dateButtonTextActive]}>
                  📅 Today
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateButton, selectedDate === 'yesterday' && styles.dateButtonActive]}
                onPress={() => {
                  setSelectedDate('yesterday');
                  setDate(moment().subtract(1, 'days').format('YYYY-MM-DD'));
                }}
              >
                <Text style={[styles.dateButtonText, selectedDate === 'yesterday' && styles.dateButtonTextActive]}>
                  📅 Yesterday
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Selected Date</Text>
            <Text style={styles.dateDisplay}>{moment(date).format('dddd, DD MMMM YYYY')}</Text>

            <Text style={styles.label}>Hours Studied</Text>
            <TextInput
              style={styles.input}
              value={hours}
              onChangeText={setHours}
              placeholder="Enter hours (e.g., 3.5)"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
              autoFocus={!todayEntry}
            />

            <Text style={styles.quickAddLabel}>⚡ Quick Add:</Text>
            <View style={styles.quickAddContainer}>
              {[0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.quickAddButton, parseFloat(hours) === val && styles.quickAddButtonActive]}
                  onPress={() => handleQuickAdd(val)}
                >
                  <Text style={[styles.quickAddText, parseFloat(hours) === val && styles.quickAddTextActive]}>
                    {val}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              mode="contained"
              onPress={handleSave}
              loading={loading}
              disabled={loading}
              style={styles.saveButton}
              labelStyle={styles.saveButtonText}
            >
              {todayEntry ? '🔄 Update Hours' : '✅ Save Hours'}
            </Button>

            {todayEntry && (
              <Text style={styles.updateNote}>
                Updating will replace today's entry
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Tips Card */}
        <Card style={[styles.card, styles.tipCard]}>
          <Card.Content>
            <Text style={styles.tipTitle}>💡 Study Tips</Text>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>Study in 25-minute Pomodoro sessions with 5-minute breaks</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>Take a 15-minute break every 2 hours to stay fresh</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>Review your progress daily to stay motivated</Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={[styles.snackbar, { backgroundColor: snackbarColor }]}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
};

// ============================================
// HISTORY SCREEN - COMPLETE
// ============================================

const History = () => {
  const [studyLog, setStudyLog] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editHours, setEditHours] = useState('');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState('#4CAF50');

  const loadStudyLog = async () => {
    try {
      const log = await getStudyLog();
      const sortedLog = log.sort((a, b) => moment(b.date).diff(moment(a.date)));
      setStudyLog(sortedLog);
    } catch (error) {
      console.error('Error loading study log:', error);
      setStudyLog([]);
    }
  };

  useEffect(() => {
    loadStudyLog();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStudyLog();
    setRefreshing(false);
  }, []);

  const handleEdit = (entry) => {
    setSelectedEntry(entry);
    setEditHours(entry.hours.toString());
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    const hoursNum = parseFloat(editHours);
    if (!hoursNum || hoursNum <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of hours');
      return;
    }
    if (hoursNum > 24) {
      Alert.alert('Invalid Input', 'Hours cannot exceed 24');
      return;
    }

    try {
      const log = await getStudyLog();
      const index = log.findIndex(e => e.date === selectedEntry.date);
      if (index !== -1) {
        log[index].hours = hoursNum;
        log[index].updatedAt = moment().toISOString();
        await saveStudyLog(log);
        await loadStudyLog();
        setModalVisible(false);
        setSnackbarMessage('✅ Entry updated successfully!');
        setSnackbarColor('#4CAF50');
        setSnackbarVisible(true);
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      setSnackbarMessage('❌ Failed to update entry');
      setSnackbarColor('#FF6B6B');
      setSnackbarVisible(true);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteStudyEntry(selectedEntry.date);
      await loadStudyLog();
      setModalVisible(false);
      setSnackbarMessage('🗑️ Entry deleted successfully');
      setSnackbarColor('#FF6B6B');
      setSnackbarVisible(true);
    } catch (error) {
      console.error('Error deleting entry:', error);
      setSnackbarMessage('❌ Failed to delete entry');
      setSnackbarColor('#FF6B6B');
      setSnackbarVisible(true);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete the entry for ${moment(selectedEntry.date).format('DD MMM YYYY')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <Card style={styles.logCard}>
      <Card.Content style={styles.logContent}>
        <View style={styles.logLeft}>
          <Text style={styles.logDate}>{moment(item.date).format('DD MMM YYYY')}</Text>
          <Text style={styles.logDay}>{moment(item.date).format('dddd')}</Text>
          {item.updatedAt && (
            <Text style={styles.logUpdated}>Updated: {moment(item.updatedAt).fromNow()}</Text>
          )}
        </View>
        <View style={styles.logRight}>
          <Text style={styles.logHours}>{item.hours.toFixed(1)} hrs</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEdit(item)}
          >
            <IconMI name="edit" size={22} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  );

  const getStats = () => {
    if (studyLog.length === 0) {
      return { total: 0, avg: 0, max: 0, min: 0, count: 0 };
    }
    const hours = studyLog.map(i => i.hours);
    const total = hours.reduce((a, b) => a + b, 0);
    const avg = total / hours.length;
    const max = Math.max(...hours);
    const min = Math.min(...hours.filter(h => h > 0));
    return { total, avg, max, min, count: studyLog.length };
  };

  const stats = getStats();

  return (
    <SafeAreaView style={styles.container}>
      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.count}</Text>
          <Text style={styles.statLabel}>Entries</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Total Hours</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.avg.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Avg Hours</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.max.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Max Hours</Text>
        </View>
      </View>

      <FlatList
        data={studyLog}
        renderItem={renderItem}
        keyExtractor={(item) => item.date}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconMI name="history" size={80} color="#ddd" />
            <Text style={styles.emptyText}>No study entries yet</Text>
            <Text style={styles.emptySubtext}>Start logging your study hours!</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

      {/* Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✏️ Edit Study Entry</Text>
            <Text style={styles.modalDate}>
              {selectedEntry ? moment(selectedEntry.date).format('dddd, DD MMMM YYYY') : ''}
            </Text>

            <Text style={styles.modalLabel}>Hours Studied</Text>
            <TextInput
              style={styles.modalInput}
              value={editHours}
              onChangeText={setEditHours}
              keyboardType="decimal-pad"
              placeholder="Enter hours"
              autoFocus
            />

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setModalVisible(false)}
                style={[styles.modalButton, styles.modalCancelButton]}
                labelStyle={styles.modalCancelText}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleUpdate}
                style={[styles.modalButton, styles.modalSaveButton]}
                labelStyle={styles.modalSaveText}
              >
                Update
              </Button>
            </View>

            <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete}>
              <IconMI name="delete" size={20} color="#FF6B6B" />
              <Text style={styles.deleteButtonText}>Delete Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={[styles.snackbar, { backgroundColor: snackbarColor }]}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
};

// ============================================
// CHARTS SCREEN - COMPLETE
// ============================================

const Charts = () => {
  const [studyLog, setStudyLog] = useState([]);
  const [chartType, setChartType] = useState('daily');
  const [chartData, setChartData] = useState({ labels: [], values: [] });
  const [periodStats, setPeriodStats] = useState({ total: 0, avg: 0, max: 0 });
  const screenWidth = useWindowDimensions().width - 48;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const log = await getStudyLog();
      setStudyLog(log);
      processChartData(log, chartType);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const processChartData = (log, type) => {
    if (log.length === 0) {
      setChartData({ labels: ['No Data'], values: [0] });
      setPeriodStats({ total: 0, avg: 0, max: 0 });
      return;
    }

    const sortedLog = [...log].sort((a, b) => moment(a.date).diff(moment(b.date)));
    let data = [];
    let labels = [];
    let total = 0;
    let max = 0;

    if (type === 'daily') {
      const days = 30;
      const today = moment();
      for (let i = days - 1; i >= 0; i--) {
        const date = today.clone().subtract(i, 'days');
        const dateStr = date.format('YYYY-MM-DD');
        const entry = sortedLog.find(e => e.date === dateStr);
        const hours = entry ? entry.hours : 0;
        data.push(hours);
        labels.push(date.format('DD'));
        total += hours;
        if (hours > max) max = hours;
      }
    } else if (type === 'weekly') {
      const weeks = 12;
      const today = moment();
      for (let i = weeks - 1; i >= 0; i--) {
        const weekStart = today.clone().subtract(i, 'weeks').startOf('week');
        const weekEnd = weekStart.clone().endOf('week');
        const weekHours = sortedLog
          .filter(e => {
            const date = moment(e.date);
            return date.isBetween(weekStart, weekEnd, null, '[]');
          })
          .reduce((sum, e) => sum + e.hours, 0);
        data.push(weekHours);
        labels.push(`W${weeks - i}`);
        total += weekHours;
        if (weekHours > max) max = weekHours;
      }
    } else if (type === 'monthly') {
      const months = 6;
      const today = moment();
      for (let i = months - 1; i >= 0; i--) {
        const monthStart = today.clone().subtract(i, 'months').startOf('month');
        const monthEnd = monthStart.clone().endOf('month');
        const monthHours = sortedLog
          .filter(e => {
            const date = moment(e.date);
            return date.isBetween(monthStart, monthEnd, null, '[]');
          })
          .reduce((sum, e) => sum + e.hours, 0);
        data.push(monthHours);
        labels.push(monthStart.format('MMM'));
        total += monthHours;
        if (monthHours > max) max = monthHours;
      }
    }

    const avg = data.length > 0 ? total / data.length : 0;
    setChartData({ labels, values: data });
    setPeriodStats({ total, avg, max });
  };

  useEffect(() => {
    processChartData(studyLog, chartType);
  }, [chartType, studyLog]);

  const getChartConfig = () => ({
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '6', strokeWidth: '2', stroke: '#4CAF50' },
    propsForBackgroundLines: { strokeDasharray: '', stroke: '#e0e0e0' },
    barPercentage: 0.7,
    fromZero: true
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>📊 Study Analytics</Text>

            <SegmentedButtons
              value={chartType}
              onValueChange={setChartType}
              buttons={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
              style={styles.segmentedButton}
            />

            {studyLog.length > 0 ? (
              <>
                <BarChart
                  data={{
                    labels: chartData.labels.length > 0 ? chartData.labels : ['No Data'],
                    datasets: [{ data: chartData.values.length > 0 ? chartData.values : [0] }]
                  }}
                  width={screenWidth}
                  height={220}
                  chartConfig={getChartConfig()}
                  style={styles.chart}
                  showValuesOnTopOfBars={true}
                />

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{periodStats.total.toFixed(1)}</Text>
                    <Text style={styles.statLabel}>Total Hours</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{periodStats.avg.toFixed(1)}</Text>
                    <Text style={styles.statLabel}>Avg Hours</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{periodStats.max.toFixed(1)}</Text>
                    <Text style={styles.statLabel}>Max Hours</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <IconMI name="bar-chart" size={60} color="#ddd" />
                <Text style={styles.emptyText}>No data available</Text>
                <Text style={styles.emptySubtext}>Start logging your study hours to see charts</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================
// SETTINGS SCREEN - COMPLETE
// ============================================

const Settings = ({ navigation }) => {
  const [settings, setSettings] = useState({
    goalHours: '500',
    startDate: new Date(),
    endDate: new Date(),
    notifications: true,
    reminderTime: '20:00',
  });
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState('#4CAF50');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setSettings({
        ...settings,
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    const goalNum = parseFloat(settings.goalHours);
    if (!goalNum || goalNum <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid goal hours (greater than 0)');
      return;
    }
    if (goalNum > 10000) {
      Alert.alert('Invalid Input', 'Goal hours cannot exceed 10,000');
      return;
    }

    if (settings.startDate >= settings.endDate) {
      Alert.alert('Invalid Dates', 'End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...settings,
        startDate: moment(settings.startDate).format('YYYY-MM-DD'),
        endDate: moment(settings.endDate).format('YYYY-MM-DD'),
      };
      const success = await saveSettings(dataToSave);
      if (success) {
        setSnackbarMessage('✅ Settings saved successfully!');
        setSnackbarColor('#4CAF50');
        setSnackbarVisible(true);
        setTimeout(() => {
          navigation.navigate('Dashboard', { refresh: true });
        }, 500);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSnackbarMessage('❌ Failed to save settings');
      setSnackbarColor('#FF6B6B');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      '⚠️ This will permanently delete all your study entries and settings. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await clearAllData();
              if (success) {
                setSnackbarMessage('✅ All data cleared successfully');
                setSnackbarColor('#FF6B6B');
                setSnackbarVisible(true);
                setTimeout(() => {
                  navigation.navigate('Dashboard');
                }, 500);
              } else {
                throw new Error('Failed to clear');
              }
            } catch (error) {
              console.error('Error clearing data:', error);
              setSnackbarMessage('❌ Failed to clear data');
              setSnackbarColor('#FF6B6B');
              setSnackbarVisible(true);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>⚙️ Settings</Text>

            <Text style={styles.label}>🎯 Goal Hours</Text>
            <TextInput
              style={styles.input}
              value={settings.goalHours}
              onChangeText={(text) => setSettings({ ...settings, goalHours: text })}
              keyboardType="decimal-pad"
              placeholder="e.g., 500"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>📅 Start Date</Text>
            <Text style={styles.dateDisplay}>{moment(settings.startDate).format('dddd, DD MMMM YYYY')}</Text>

            <Text style={styles.label}>📅 End Date</Text>
            <Text style={styles.dateDisplay}>{moment(settings.endDate).format('dddd, DD MMMM YYYY')}</Text>

            <View style={styles.switchContainer}>
              <View>
                <Text style={styles.label}>🔔 Daily Reminder</Text>
                <Text style={styles.switchSubtext}>Get reminded to log your study hours</Text>
              </View>
              <Switch
                value={settings.notifications}
                onValueChange={(value) => setSettings({ ...settings, notifications: value })}
                trackColor={{ false: '#767577', true: '#81C784' }}
                thumbColor={settings.notifications ? '#4CAF50' : '#f4f3f4'}
              />
            </View>

            {settings.notifications && (
              <>
                <Text style={styles.label}>⏰ Reminder Time</Text>
                <TextInput
                  style={styles.input}
                  value={settings.reminderTime}
                  onChangeText={(text) => setSettings({ ...settings, reminderTime: text })}
                  placeholder="e.g., 20:00"
                  placeholderTextColor="#999"
                />
                <Text style={styles.hint}>Enter time in 24-hour format (HH:MM)</Text>
              </>
            )}

            <Button
              mode="contained"
              onPress={handleSaveSettings}
              loading={loading}
              disabled={loading}
              style={styles.saveButton}
              labelStyle={styles.saveButtonText}
            >
              💾 Save Settings
            </Button>
          </Card.Content>
        </Card>

        <Card style={[styles.card, styles.dangerCard]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: '#FF6B6B' }]}>⚠️ Data Management</Text>

            <List.Item
              title="🗑️ Clear All Data"
              description="Permanently delete all entries and settings"
              left={props => <List.Icon {...props} icon="delete" color="#FF6B6B" />}
              onPress={handleClearData}
              titleStyle={{ color: '#FF6B6B', fontWeight: '600' }}
            />

            <Divider style={styles.divider} />

            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>📊 Data stored locally on your device</Text>
              <Text style={styles.infoSubtext}>No internet connection required</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.card, styles.aboutCard]}>
          <Card.Content>
            <Text style={styles.cardTitle}>📖 About</Text>
            <Text style={styles.aboutTitle}>Study Goal Tracker</Text>
            <Text style={styles.aboutVersion}>Version 2.0.0</Text>
            <Text style={styles.aboutDescription}>
              Track your study goals with the Required Study Rate (RSR) concept.
              Just log your daily hours and let the app calculate everything else!
            </Text>
            <View style={styles.featuresList}>
              <Text style={styles.featureItem}>✓ Real-time progress tracking</Text>
              <Text style={styles.featureItem}>✓ Study streaks and motivation</Text>
              <Text style={styles.featureItem}>✓ Interactive charts</Text>
              <Text style={styles.featureItem}>✓ Data stored locally</Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={[styles.snackbar, { backgroundColor: snackbarColor }]}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
};

// ============================================
// MAIN APP - COMPLETE
// ============================================

export default function App() {
  return (
    <PaperProvider>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === 'Dashboard') {
                iconName = focused ? 'speedometer' : 'speedometer-outline';
              } else if (route.name === 'Log Study') {
                iconName = focused ? 'book' : 'book-outline';
              } else if (route.name === 'History') {
                iconName = focused ? 'list' : 'list-outline';
              } else if (route.name === 'Charts') {
                iconName = focused ? 'bar-chart' : 'bar-chart-outline';
              } else if (route.name === 'Settings') {
                iconName = focused ? 'settings' : 'settings-outline';
              }
              return <Icon name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#4CAF50',
            tabBarInactiveTintColor: '#999999',
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopWidth: 1,
              borderTopColor: '#E0E0E0',
              paddingBottom: Platform.OS === 'ios' ? 20 : 8,
              paddingTop: 8,
              height: Platform.OS === 'ios' ? 85 : 65,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '500',
            },
            headerStyle: {
              backgroundColor: '#4CAF50',
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
            },
            headerTitleAlign: 'center',
          })}
        >
          <Tab.Screen
            name="Dashboard"
            component={Dashboard}
            options={{ title: '📊 Dashboard' }}
          />
          <Tab.Screen
            name="Log Study"
            component={LogStudy}
            options={{ title: '📝 Log Study' }}
          />
          <Tab.Screen
            name="History"
            component={History}
            options={{ title: '📋 History' }}
          />
          <Tab.Screen
            name="Charts"
            component={Charts}
            options={{ title: '📈 Charts' }}
          />
          <Tab.Screen
            name="Settings"
            component={Settings}
            options={{ title: '⚙️ Settings' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

// ============================================
// COMPLETE STYLES - EVERYTHING INCLUDED
// ============================================

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },

  // Header Card
  headerCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  hoursText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  todayLoggedBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'center',
  },
  todayLoggedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Motivation Card
  motivationCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    elevation: 2,
  },
  motivationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F57C00',
    textAlign: 'center',
    paddingVertical: 4,
  },

  // Grid Layouts
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  gridCard: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gridLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  gridValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
    marginTop: 4,
  },

  // Status Card
  statusCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTextContainer: {
    marginLeft: 12,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '800',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  estimatedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  estimatedLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  estimatedValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },

  // Streak Cards
  streakCard: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  streakLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  streakValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FF6B35',
    marginTop: 4,
  },

  // Small Stats Cards
  statsSmallCard: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  statsSmallLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  statsSmallValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 2,
  },

  // FAB
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4CAF50',
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },

  // Cards
  card: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },

  // Log Study
  dateSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dateButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  dateButtonTextActive: {
    color: '#FFFFFF',
  },
  dateDisplay: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  quickAddLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 8,
    fontWeight: '500',
  },
  quickAddContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  quickAddButton: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    margin: 4,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  quickAddButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  quickAddText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  quickAddTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    marginTop: 8,
    paddingVertical: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  updateNote: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 8,
  },
  todayEntry: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  todayEntryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  todayEntrySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  // Tips
  tipCard: {
    backgroundColor: '#E3F2FD',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1565C0',
    marginBottom: 8,
  },
  tipItem: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  tipBullet: {
    fontSize: 16,
    color: '#1565C0',
    marginRight: 8,
    fontWeight: '700',
  },
  tipText: {
    fontSize: 14,
    color: '#1565C0',
    flex: 1,
  },

  // History
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 8,
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  logCard: {
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  logContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  logLeft: {
    flex: 1,
  },
  logDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  logDay: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  logUpdated: {
    fontSize: 11,
    color: '#bbb',
    marginTop: 2,
  },
  logRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logHours: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
    marginRight: 8,
  },
  editButton: {
    padding: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  modalDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
  },
  modalCancelButton: {
    borderColor: '#999',
  },
  modalCancelText: {
    color: '#666',
  },
  modalSaveButton: {
    backgroundColor: '#4CAF50',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  deleteButtonText: {
    color: '#FF6B6B',
    fontWeight: '600',
    marginLeft: 8,
  },

  // Charts
  segmentedButton: {
    marginBottom: 16,
  },
  chart: {
    marginVertical: 16,
    borderRadius: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },

  // Settings
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  switchSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: -12,
    marginBottom: 16,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  divider: {
    marginVertical: 16,
  },
  infoContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },

  // About
  aboutCard: {
    backgroundColor: '#F5F5F5',
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  aboutVersion: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  aboutDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    lineHeight: 20,
  },
  featuresList: {
    marginTop: 12,
  },
  featureItem: {
    fontSize: 13,
    color: '#4CAF50',
    marginVertical: 2,
    fontWeight: '500',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },

  // Snackbar
  snackbar: {
    borderRadius: 12,
    margin: 16,
  },

  // Common
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
});
