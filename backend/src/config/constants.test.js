// Constants tests
const { describe, it, expect } = require('@jest/globals');
const {
  ROLES,
  VERDICTS,
  PROBLEM_STATUS,
  CONTEST_STATUS,
  DIFFICULTY,
  LANGUAGES,
  LIMITS,
  REDIS_KEYS,
} = require('./constants');

describe('Constants Configuration', () => {
  describe('ROLES', () => {
    it('should define all three user roles', () => {
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLES.PROBLEM_SETTER).toBe('problem_setter');
      expect(ROLES.CONTESTANT).toBe('contestant');
    });

    it('should have exactly 3 roles', () => {
      expect(Object.keys(ROLES)).toHaveLength(3);
    });
  });

  describe('VERDICTS', () => {
    it('should define all submission verdicts', () => {
      expect(VERDICTS.AC).toBe('AC');
      expect(VERDICTS.WA).toBe('WA');
      expect(VERDICTS.TLE).toBe('TLE');
      expect(VERDICTS.MLE).toBe('MLE');
      expect(VERDICTS.RE).toBe('RE');
      expect(VERDICTS.CE).toBe('CE');
      expect(VERDICTS.PENDING).toBe('PENDING');
    });

    it('should have exactly 7 verdicts', () => {
      expect(Object.keys(VERDICTS)).toHaveLength(7);
    });
  });

  describe('PROBLEM_STATUS', () => {
    it('should define all problem statuses', () => {
      expect(PROBLEM_STATUS.DRAFT).toBe('draft');
      expect(PROBLEM_STATUS.PUBLISHED).toBe('published');
      expect(PROBLEM_STATUS.REJECTED).toBe('rejected');
    });

    it('should have exactly 3 statuses', () => {
      expect(Object.keys(PROBLEM_STATUS)).toHaveLength(3);
    });
  });

  describe('CONTEST_STATUS', () => {
    it('should define all contest statuses', () => {
      expect(CONTEST_STATUS.UPCOMING).toBe('upcoming');
      expect(CONTEST_STATUS.ONGOING).toBe('ongoing');
      expect(CONTEST_STATUS.ENDED).toBe('ended');
    });

    it('should have exactly 3 statuses', () => {
      expect(Object.keys(CONTEST_STATUS)).toHaveLength(3);
    });
  });

  describe('DIFFICULTY', () => {
    it('should define all difficulty levels', () => {
      expect(DIFFICULTY.EASY).toBe('easy');
      expect(DIFFICULTY.MEDIUM).toBe('medium');
      expect(DIFFICULTY.HARD).toBe('hard');
    });

    it('should have exactly 3 difficulty levels', () => {
      expect(Object.keys(DIFFICULTY)).toHaveLength(3);
    });
  });

  describe('LANGUAGES', () => {
    it('should define supported programming languages', () => {
      expect(LANGUAGES.CPP).toBe('cpp');
      expect(LANGUAGES.PYTHON).toBe('python');
    });

    it('should have exactly 2 languages', () => {
      expect(Object.keys(LANGUAGES)).toHaveLength(2);
    });
  });

  describe('LIMITS', () => {
    it('should define auth limits', () => {
      expect(LIMITS.LOGIN_ATTEMPTS_PER_IP).toBe(10);
      expect(LIMITS.LOGIN_WINDOW_MINUTES).toBe(15);
      expect(LIMITS.MIN_PASSWORD_LENGTH).toBe(8);
      expect(LIMITS.BCRYPT_COST_FACTOR).toBe(10);
    });

    it('should define token expiry', () => {
      expect(LIMITS.ACCESS_TOKEN_EXPIRY).toBe('15m');
      expect(LIMITS.REFRESH_TOKEN_EXPIRY).toBe('7d');
    });

    it('should define problem limits', () => {
      expect(LIMITS.MIN_TIME_LIMIT_MS).toBe(100);
      expect(LIMITS.MIN_MEMORY_LIMIT_MB).toBe(16);
    });

    it('should define contest limits', () => {
      expect(LIMITS.MIN_CONTEST_DURATION_MINUTES).toBe(30);
    });

    it('should define judge limits', () => {
      expect(LIMITS.MAX_CONCURRENT_JUDGES).toBe(5);
      expect(LIMITS.JUDGE_GRACE_PERIOD_SECONDS).toBe(2);
    });

    it('should define AI hint limits', () => {
      expect(LIMITS.MAX_HINTS_PER_PROBLEM).toBe(3);
    });

    it('should define cache TTL values', () => {
      expect(LIMITS.CACHE_TTL_PROBLEM_LIST).toBe(60);
      expect(LIMITS.CACHE_TTL_USER_PROFILE).toBe(300);
      expect(LIMITS.CACHE_TTL_LEADERBOARD).toBe(10);
    });

    it('should define leaderboard limits', () => {
      expect(LIMITS.LEADERBOARD_TOP_N).toBe(50);
    });

    it('should define ICPC scoring constants', () => {
      expect(LIMITS.ICPC_BASE_SCORE_PER_PROBLEM).toBe(100);
      expect(LIMITS.ICPC_PENALTY_PER_WA).toBe(20);
    });

    it('should define socket reconnection timeout', () => {
      expect(LIMITS.SOCKET_RECONNECT_TIMEOUT_SECONDS).toBe(30);
    });

    it('should define MongoDB retry limits', () => {
      expect(LIMITS.MAX_DB_RETRIES).toBe(5);
      expect(LIMITS.DB_RETRY_DELAY_MS).toBe(5000);
    });
  });

  describe('REDIS_KEYS', () => {
    it('should define Redis key prefixes', () => {
      expect(REDIS_KEYS.REFRESH_TOKEN).toBe('refresh');
      expect(REDIS_KEYS.BLACKLIST).toBe('blacklist');
      expect(REDIS_KEYS.PROBLEM_LIST).toBe('problems:list');
      expect(REDIS_KEYS.USER_PROFILE).toBe('user:profile');
      expect(REDIS_KEYS.LEADERBOARD).toBe('leaderboard');
    });

    it('should have exactly 5 key prefixes', () => {
      expect(Object.keys(REDIS_KEYS)).toHaveLength(5);
    });
  });

  describe('Consistency with Requirements', () => {
    it('should match role values used in User model', () => {
      const modelRoles = ['admin', 'problem_setter', 'contestant'];
      const constantRoles = Object.values(ROLES);
      expect(constantRoles.sort()).toEqual(modelRoles.sort());
    });

    it('should match verdict values used in Submission model', () => {
      const modelVerdicts = ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'PENDING'];
      const constantVerdicts = Object.values(VERDICTS);
      expect(constantVerdicts.sort()).toEqual(modelVerdicts.sort());
    });

    it('should match language values used in Submission model', () => {
      const modelLanguages = ['cpp', 'python'];
      const constantLanguages = Object.values(LANGUAGES);
      expect(constantLanguages.sort()).toEqual(modelLanguages.sort());
    });

    it('should match problem status values used in Problem model', () => {
      const modelStatuses = ['draft', 'published', 'rejected'];
      const constantStatuses = Object.values(PROBLEM_STATUS);
      expect(constantStatuses.sort()).toEqual(modelStatuses.sort());
    });

    it('should match contest status values used in Contest model', () => {
      const modelStatuses = ['upcoming', 'ongoing', 'ended'];
      const constantStatuses = Object.values(CONTEST_STATUS);
      expect(constantStatuses.sort()).toEqual(modelStatuses.sort());
    });

    it('should match difficulty values used in Problem model', () => {
      const modelDifficulties = ['easy', 'medium', 'hard'];
      const constantDifficulties = Object.values(DIFFICULTY);
      expect(constantDifficulties.sort()).toEqual(modelDifficulties.sort());
    });
  });

  describe('Requirement Compliance', () => {
    it('should enforce rate limit of 10 login attempts per 15 minutes', () => {
      expect(LIMITS.LOGIN_ATTEMPTS_PER_IP).toBe(10);
      expect(LIMITS.LOGIN_WINDOW_MINUTES).toBe(15);
    });

    it('should enforce minimum password length of 8 characters', () => {
      expect(LIMITS.MIN_PASSWORD_LENGTH).toBe(8);
    });

    it('should use bcrypt cost factor of 10', () => {
      expect(LIMITS.BCRYPT_COST_FACTOR).toBe(10);
    });

    it('should set access token expiry to 15 minutes', () => {
      expect(LIMITS.ACCESS_TOKEN_EXPIRY).toBe('15m');
    });

    it('should set refresh token expiry to 7 days', () => {
      expect(LIMITS.REFRESH_TOKEN_EXPIRY).toBe('7d');
    });

    it('should enforce minimum contest duration of 30 minutes', () => {
      expect(LIMITS.MIN_CONTEST_DURATION_MINUTES).toBe(30);
    });

    it('should limit concurrent judge executions to 5', () => {
      expect(LIMITS.MAX_CONCURRENT_JUDGES).toBe(5);
    });

    it('should limit hints to 3 per problem', () => {
      expect(LIMITS.MAX_HINTS_PER_PROBLEM).toBe(3);
    });

    it('should cache problem list for 60 seconds', () => {
      expect(LIMITS.CACHE_TTL_PROBLEM_LIST).toBe(60);
    });

    it('should cache user profile for 300 seconds', () => {
      expect(LIMITS.CACHE_TTL_USER_PROFILE).toBe(300);
    });

    it('should cache leaderboard for 10 seconds', () => {
      expect(LIMITS.CACHE_TTL_LEADERBOARD).toBe(10);
    });

    it('should return top 50 leaderboard entries', () => {
      expect(LIMITS.LEADERBOARD_TOP_N).toBe(50);
    });

    it('should use ICPC scoring with 20-minute penalty per WA', () => {
      expect(LIMITS.ICPC_PENALTY_PER_WA).toBe(20);
    });
  });
});
