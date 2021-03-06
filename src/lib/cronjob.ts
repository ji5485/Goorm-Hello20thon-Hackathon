import ChallengeGroup from '../models/ChallengeGroup';
import clc from 'cli-color';
import { Op } from 'sequelize';
import moment from 'moment';
import User from '../models/User';
import Challenge from '../models/Challenge';

const getTodayDate = () => {
  const date = new Date();

  return [
    moment(date)
      .subtract(1, 'day')
      .endOf('day'),
    moment(date).endOf('day'),
  ];
};

const getStartDate = () => {
  let date = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);

  return [
    moment(date)
      .subtract(1, 'day')
      .endOf('day'),
    moment(date).endOf('day'),
  ];
};

const checkOngoingChallengeGroup = async () => {
  const start_date: any = getTodayDate();

  // Find Challenge Group that Start Date is Today
  let challengeGroups: any;

  try {
    challengeGroups = await ChallengeGroup.findAll({
      where: {
        start_date: {
          [Op.gte]: start_date[0],
          [Op.lte]: start_date[1],
        },
      },
    });
  } catch (e) {
    console.log(
      clc.red(
        'Cannot Find Corresponding Challenge Group (location: checkOngoingChallengeGroup)',
      ),
    );
    return;
  }

  if (challengeGroups.length === 0) return;

  await challengeGroups.forEach(async (challengeGroup: any) => {
    await challengeGroup.update({ status: 'ONGOING' });
  });
};

const checkCompleteChallengeGroup = async () => {
  const start_date: any = getStartDate();

  // Find Challenge Group that End Date is Today
  let challengeGroups: any;

  try {
    challengeGroups = await ChallengeGroup.findAll({
      where: {
        status: {
          [Op.eq]: 'ONGOING',
        },
        start_date: {
          [Op.gte]: start_date[0],
          [Op.lt]: start_date[1],
        },
      },
    });
  } catch (e) {
    console.log(
      clc.red(
        'Cannot Find Corresponding Challenge Group (location: checkCompleteChallengeGroup)',
      ),
    );
    return;
  }

  if (challengeGroups.length === 0) return;

  await challengeGroups.forEach(async (challengeGroup: any) => {
    await challengeGroup.update({ status: 'COMPLETE' });

    const allChallenge = await Challenge.findAll({
      where: { challenge_group_id: challengeGroup.id },
    });

    // 100% refund for users with more than 27 certifications
    const successChallenge = allChallenge.filter(
      async (challenge: any) =>
        (await challenge.$count('certification', {
          where: { verification: 'SUCCESS' },
        })) >= 27,
    );

    successChallenge.forEach(async (challenge: any) => {
      const user = await challenge.$get('user');
      await User.increment(
        { money: challengeGroup.price },
        { where: { id: user.id } },
      );
    });

    // People that have 31 certifications share money of failure people
    const perfectChallenge = successChallenge.filter(
      async (challenge: any) =>
        (await challenge.$count('certification', {
          where: { verification: 'SUCCESS' },
        })) === 31,
    );

    if (perfectChallenge.length === 0) return;

    const dividedMoney =
      ((allChallenge.length - successChallenge.length) * challengeGroup.price) /
      perfectChallenge.length;

    perfectChallenge.forEach(async (challenge: any) => {
      const user = await challenge.$get('user');
      await User.increment({ money: dividedMoney }, { where: { id: user.id } });
    });
  });
};

const calculateChallengeGroupAchievement = async () => {
  // Find ONGOING Challenge Group
  let challengeGroups: any;

  try {
    challengeGroups = await ChallengeGroup.findAll({
      where: { status: 'ONGOING' },
    });
  } catch (e) {
    console.log(
      clc.red(
        'Cannot Find Corresponding Challenge Group (location: calculateChallengeGroupAchievement)',
      ),
    );
    return;
  }

  if (challengeGroups.length === 0) return;

  // Calculate Total Achievement
  const calculateAchievement = (challenges: any) =>
    challenges.reduce(
      (total: number, challenge: any) => total + challenge.achievement,
      0,
    ) / challenges.length;

  await challengeGroups.forEach(async (challengeGroup: any) => {
    const challenges = await challengeGroup.$get('challenges');
    const total_achievement = calculateAchievement(challenges);

    await challengeGroup.update({ total_achievement });
  });
};

const cronjob = async () => {
  await calculateChallengeGroupAchievement();
  await checkOngoingChallengeGroup();
  await checkCompleteChallengeGroup();
};

export default cronjob;
