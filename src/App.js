import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Area, ReferenceLine } from 'recharts';
import { Calculator, Settings, TrendingUp, DollarSign, PiggyBank, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { addYears, format, parseISO, differenceInMonths, addMonths } from 'date-fns';

const RetirementPlanner = () => {
  const today = new Date();
  const defaultBirthDate = '1991-07-13';
  const [birthDate, setBirthDate] = useState(defaultBirthDate);
  const [currentYear, setCurrentYear] = useState(2025);
  const [annualIncome, setAnnualIncome] = useState(170000);
  const [incomeGrowthRate, setIncomeGrowthRate] = useState(0.03);
  const [useIncomeGrowth, setUseIncomeGrowth] = useState(false);
  const [federalTaxRate, setFederalTaxRate] = useState(0.22);
  const [stateTaxRate, setStateTaxRate] = useState(0.05);
  const [inflationRate, setInflationRate] = useState(0.03);
  const [retirementAge, setRetirementAge] = useState(65);
  const [lifeExpectancy, setLifeExpectancy] = useState(90);
  
  const [currentTaxable, setCurrentTaxable] = useState(30000);
  const [current401k, setCurrent401k] = useState(100000);
  const [currentRoth, setCurrentRoth] = useState(100000);
  
  const [socialSecurityAmount, setSocialSecurityAmount] = useState(2500);
  const [socialSecurityAge, setSocialSecurityAge] = useState(67);
  const [swr, setSwr] = useState(0.04);
  
  const [useAssetClasses, setUseAssetClasses] = useState(false);
  const [generalReturn, setGeneralReturn] = useState(0.07);
  const [assetClasses, setAssetClasses] = useState([
    { name: 'Stocks', allocation: 0.7, return: 0.08 },
    { name: 'Bonds', allocation: 0.2, return: 0.04 },
    { name: 'REITs', allocation: 0.1, return: 0.06 }
  ]);
  

  
  const [additionalIncome, setAdditionalIncome] = useState([]);
  
  // UI State
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    tax: true,
    balances: true,
    investments: true,
    savings: true,
    expenses: true,
    additionalIncome: true
  });

  // Add a toggle for showing the first row for today
  const [showTodayRow, setShowTodayRow] = useState(true);

  // Add state for custom portfolio withdrawals
  const [customWithdrawalAnnual, setCustomWithdrawalAnnual] = useState(null);

  // Add state for retirement return rate
  const [retirementReturn, setRetirementReturn] = useState(0.04);

  // Add state for custom total portfolio (overrides individual balances if set)
  const [customTotalPortfolio, setCustomTotalPortfolio] = useState('');
  const [isEditingTotal, setIsEditingTotal] = useState(false);

  // Profiles state
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Helper to get current age in years from birthDate
  const getCurrentAgeYears = () => {
    const now = new Date();
    const birth = parseISO(birthDate);
    const months = differenceInMonths(now, birth);
    return Math.floor(months / 12);
  };

  const calculateCoastFIRE = (yearsToRetirement, fireAtRetirement, nominalReturn) => {
    return fireAtRetirement / Math.pow(1 + nominalReturn, yearsToRetirement);
  };
  
  const calculateFIRE = (age, expenses) => {
    console.log('SWR:', swr);
    return expenses / swr;
  };

  const formatYAxis = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };
  
  const getAgeInMonths = (date, birthDate) => differenceInMonths(date, parseISO(birthDate));
  const getAgeString = (months) => {
    const years = Math.floor(months / 12);
    const mos = months % 12;
    return `${years} yrs${mos > 0 ? ` ${mos} mos` : ''}`;
  };

  const [savingsPeriods, setSavingsPeriods] = useState([]);
  const [expensePeriods, setExpensePeriods] = useState([]);

  // Calculate fireAtRetirement at the top level so it can be used in both the table and Key Metrics
  const effectiveReturn = useAssetClasses ? 
    assetClasses.reduce((acc, asset) => acc + (asset.allocation * asset.return), 0) : 
    generalReturn;
  const userBirthDate = parseISO(birthDate);
  const now = new Date();
  const retirementDate = addYears(userBirthDate, retirementAge);
  const monthsToRetirement = differenceInMonths(retirementDate, now);
  // let fireAtRetirement = 0; // Removed to fix redeclaration error
  // Find the applicable expense period at retirement
  

  // Calculate years to retirement as a decimal
  const currentAgeYears = getCurrentAgeYears();
  const yearsToRetirement = retirementAge - currentAgeYears;

  // Calculate today's annual expenses (from the current applicable expense period)
  const applicableExpensePeriodNow = expensePeriods.find(period =>
    currentAgeYears >= period.startAge && currentAgeYears <= period.endAge
  );
  let todaysExpenses = 0;
  if (applicableExpensePeriodNow) {
    if (applicableExpensePeriodNow.replacementRate) {
      const baseIncome = annualIncome;
      todaysExpenses = baseIncome * applicableExpensePeriodNow.replacementRate;
    } else {
      todaysExpenses = applicableExpensePeriodNow.amount;
    }
  }

  // Calculate retirement expenses (inflation-adjusted)
  const retirementExpenses = todaysExpenses * Math.pow(1 + inflationRate, yearsToRetirement);
  // Calculate FIRE at retirement
  const fireAtRetirement = retirementExpenses / swr;

  const projectionData = useMemo(() => {
    const data = [];
    let cumulativeInflation = 1;
    
    const startDate = new Date();
    const startMonths = 0;
    const retirementMonths = (retirementAge * 12);
    const lifeExpectancyMonths = (lifeExpectancy * 12);
    const endDate = addMonths(userBirthDate, lifeExpectancyMonths);
    const monthsToProject = differenceInMonths(endDate, startDate);

    let projTaxable = currentTaxable;
    let proj401k = current401k;
    let projRoth = currentRoth;
    for (let m = 0; m <= monthsToProject; m++) {
      const currentDate = addMonths(startDate, m);
      const ageInMonths = getAgeInMonths(currentDate, birthDate);
      const ageYears = Math.floor(ageInMonths / 12);
      const ageDisplay = getAgeString(ageInMonths);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      if (showTodayRow && m === 0) {
        // Calculate current annual expenses
        let currentAnnualExpenses = 0;
        const currentAge = getCurrentAgeYears();
        const applicableExpensePeriod = expensePeriods.find(period =>
          currentAge >= period.startAge && currentAge <= period.endAge
        );
        if (applicableExpensePeriod) {
          if (applicableExpensePeriod.replacementRate) {
            const baseIncome = annualIncome;
            currentAnnualExpenses = baseIncome * applicableExpensePeriod.replacementRate;
          } else {
            currentAnnualExpenses = applicableExpensePeriod.amount;
          }
        }
        const currentTotalInvestments = projTaxable + proj401k + projRoth;
        data.push({
          age: ageDisplay,
          ageYears: ageYears,
          year,
          annualIncome: annualIncome,
          takeHomePay: annualIncome * (1 - federalTaxRate - stateTaxRate),
          annualExpenses: currentAnnualExpenses,
          annualSavings: 0,
          totalInvestments: currentTotalInvestments,
          fireNumber: calculateFIRE(currentAge, currentAnnualExpenses),
          coastFIRE: calculateCoastFIRE(retirementAge - currentAge, fireAtRetirement, effectiveReturn),
          additionalIncome: 0,
          retirementIncome: 0,
          socialSecurityIncome: 0,
          withdrawals: 0,
          taxesOnWithdrawals: 0
        });
        continue;
      }

      if (m % 12 === 0 && m > 0) cumulativeInflation *= (1 + inflationRate);

      let adjustedIncome = 0;
      if (ageYears < retirementAge) {
        const yearsFromStart = ageYears - Math.floor(getAgeInMonths(startDate, birthDate) / 12);
        if (useIncomeGrowth) {
          adjustedIncome = annualIncome * Math.pow(1 + incomeGrowthRate, yearsFromStart) * cumulativeInflation;
        } else {
          adjustedIncome = annualIncome * cumulativeInflation;
        }
      }
      
      const federalTax = adjustedIncome * federalTaxRate;
      const stateTax = adjustedIncome * stateTaxRate;
      const takeHomePay = adjustedIncome - federalTax - stateTax;
      
      const applicableSavingsPeriod = savingsPeriods.find(period => 
        ageYears >= period.startAge && ageYears <= period.endAge
      );
      
      let monthlySavings = 0;
      if (applicableSavingsPeriod && ageYears < retirementAge) {
        const isPercent = applicableSavingsPeriod.amountType === 'percent';
        if (isPercent) {
          // amount is a percent (e.g., 0.25 for 25%) of after-tax income
          const percent = applicableSavingsPeriod.amount;
          monthlySavings = (takeHomePay * percent) / 12;
        } else {
          // amount is a dollar value
          const yearsInPeriod = ageYears - applicableSavingsPeriod.startAge;
          let baseAmount = applicableSavingsPeriod.amount;
          if (applicableSavingsPeriod.growthType === 'growth' && yearsInPeriod > 0) {
            baseAmount = applicableSavingsPeriod.amount * Math.pow(1 + applicableSavingsPeriod.growthRate, yearsInPeriod);
          }
          if (applicableSavingsPeriod.growthType === 'growth') {
            monthlySavings = (baseAmount * cumulativeInflation) / 12;
          } else {
            monthlySavings = baseAmount / 12;
          }
        }
      }
      
      const applicableExpensePeriod = expensePeriods.find(period => 
        ageYears >= period.startAge && ageYears <= period.endAge
      );
      
      let monthlyExpenses = 0;
      if (applicableExpensePeriod) {
        if (applicableExpensePeriod.replacementRate) {
          const baseIncome = ageYears < retirementAge ? adjustedIncome : 
            (useIncomeGrowth ? 
              annualIncome * Math.pow(1 + incomeGrowthRate, retirementAge - ageYears) :
              annualIncome);
          monthlyExpenses = (baseIncome * applicableExpensePeriod.replacementRate * cumulativeInflation) / 12;
        } else {
          monthlyExpenses = (applicableExpensePeriod.amount * cumulativeInflation) / 12;
        }
      } else {
        monthlyExpenses = 0;
      }
      
      const socialSecurityIncome = (ageYears >= socialSecurityAge) ? 
        (socialSecurityAmount * 12 * cumulativeInflation) / 12 : 0;
      
      let totalAdditionalIncome = 0;
      additionalIncome.forEach(income => {
        if (income.type === 'annual' && ageYears >= income.startAge && ageYears <= income.endAge) {
          // Recurring: always inflation-adjusted
          totalAdditionalIncome += (income.amount * cumulativeInflation) / 12;
        } else if (income.type === 'one-time' && ageYears === income.startAge && ageInMonths % 12 === 0) {
          // One-time: only add if at event year/month, and respect inflation checkbox
          totalAdditionalIncome += income.inflate ? income.amount * cumulativeInflation : income.amount;
        }
      });
      
      let withdrawals = 0;
      let taxesOnWithdrawals = 0;
      if (ageYears >= retirementAge) {
        const flatTaxRate = federalTaxRate + stateTaxRate;
        if (customWithdrawalAnnual !== null) {
          withdrawals = customWithdrawalAnnual / 12;
          taxesOnWithdrawals = withdrawals * flatTaxRate;
        } else {
          const neededIncome = monthlyExpenses - socialSecurityIncome - totalAdditionalIncome;
          if (neededIncome > 0) {
            // Algebraic solution: withdrawal = neededIncome / (1 - taxRate)
            withdrawals = neededIncome / (1 - flatTaxRate);
            taxesOnWithdrawals = withdrawals * flatTaxRate;
          }
        }
      }
      
      const currentReturn = ageYears < retirementAge ? effectiveReturn : retirementReturn;
      const totalInvestments = projTaxable + proj401k + projRoth;
      const growthAmount = totalInvestments * (currentReturn / 12);
      
      // 1. Apply growth to existing balances
      if (totalInvestments > 0) {
        const taxableGrowth = (projTaxable / totalInvestments) * growthAmount;
        const traditional401kGrowth = (proj401k / totalInvestments) * growthAmount;
        const rothGrowth = (projRoth / totalInvestments) * growthAmount;
        
        projTaxable += taxableGrowth;
        proj401k += traditional401kGrowth;
        projRoth += rothGrowth;
      }
      
      // 2. Add new monthly savings after growth
      if (monthlySavings > 0) {
        proj401k += monthlySavings * 0.7;
        projTaxable += monthlySavings * 0.3;
      }
      
      if (withdrawals > 0) {
        const totalAfterGrowth = projTaxable + proj401k + projRoth;
        if (totalAfterGrowth > 0) {
          const withdrawalRatio = withdrawals / totalAfterGrowth;
          projTaxable -= projTaxable * withdrawalRatio;
          proj401k -= proj401k * withdrawalRatio;
          projRoth -= projRoth * withdrawalRatio;
        }
      }
      
      const totalInvestmentsAfter = projTaxable + proj401k + projRoth;
      const coastFIRE = calculateCoastFIRE(retirementAge - ageYears, fireAtRetirement, effectiveReturn);
      const fireNumber = calculateFIRE(ageYears, monthlyExpenses * 12);
      
      // For retirementIncome, do not include one-time events (only recurring, social security, withdrawals)
      const retirementIncome = socialSecurityIncome + additionalIncome.filter(inc => inc.type === 'annual').reduce((sum, inc) => sum + ((inc.amount * cumulativeInflation) / 12), 0) + withdrawals - taxesOnWithdrawals;
      
      if (showTodayRow) {
        if (m % 12 === 0) {
          data.push({
            age: ageDisplay,
            ageYears: ageYears,
            year,
            annualIncome: adjustedIncome,
            takeHomePay,
            annualExpenses: monthlyExpenses * 12,
            annualSavings: monthlySavings * 12,
            totalInvestments: totalInvestmentsAfter,
            fireNumber,
            coastFIRE,
            additionalIncome: totalAdditionalIncome * 12,
            retirementIncome: retirementIncome * 12,
            socialSecurityIncome: socialSecurityIncome * 12,
            withdrawals: withdrawals * 12,
            taxesOnWithdrawals: taxesOnWithdrawals * 12
          });
        }
      } else {
        if (month === 1) {
          data.push({
            age: ageDisplay,
            ageYears: ageYears,
            year,
            annualIncome: adjustedIncome,
            takeHomePay,
            annualExpenses: monthlyExpenses * 12,
            annualSavings: monthlySavings * 12,
            totalInvestments: totalInvestmentsAfter,
            fireNumber,
            coastFIRE,
            additionalIncome: totalAdditionalIncome * 12,
            retirementIncome: retirementIncome * 12,
            socialSecurityIncome: socialSecurityIncome * 12,
            withdrawals: withdrawals * 12,
            taxesOnWithdrawals: taxesOnWithdrawals * 12
          });
        }
      }

      // Add one-time portfolio additions at the correct age (only once per event)
      additionalIncome.filter(inc => inc.type === 'one-time').forEach(event => {
        if (ageYears === event.startAge && ageInMonths % 12 === 0) {
          projTaxable += event.inflate ? event.amount * cumulativeInflation : event.amount;
        }
      });
    }
    
    return data;
  }, [
    birthDate, currentYear, annualIncome, incomeGrowthRate, useIncomeGrowth,
    federalTaxRate, stateTaxRate, inflationRate, retirementAge, lifeExpectancy,
    currentTaxable, current401k, currentRoth, socialSecurityAmount, socialSecurityAge,
    useAssetClasses, generalReturn, assetClasses, savingsPeriods, expensePeriods,
    additionalIncome, useIncomeGrowth, showTodayRow, swr, customWithdrawalAnnual
  ]);

  // Set initial values or update startAge when birthDate changes
  useEffect(() => {
    const currentAge = getCurrentAgeYears();
    if (savingsPeriods.length === 0) {
      setSavingsPeriods([
        { startAge: currentAge, endAge: 65, amount: 25000, amountType: 'dollar', type: 'fixed', growthType: 'fixed', growthRate: 0.03 }
      ]);
    }
    if (expensePeriods.length === 0) {
      setExpensePeriods([
        { startAge: currentAge, endAge: lifeExpectancy, amount: 60000 }
      ]);
    }
    // eslint-disable-next-line
  }, [birthDate, lifeExpectancy]);

  const addSavingsPeriod = () => {
    const lastPeriod = savingsPeriods[savingsPeriods.length - 1];
    const newStartAge = lastPeriod ? lastPeriod.endAge : getCurrentAgeYears();
    setSavingsPeriods([...savingsPeriods, {
      startAge: newStartAge,
      endAge: retirementAge,
      amount: 25000,
      amountType: 'dollar',
      type: 'fixed',
      growthType: 'fixed',
      growthRate: 0.03
    }]);
  };

  const addExpensePeriod = () => {
    const lastPeriod = expensePeriods[expensePeriods.length - 1];
    const newStartAge = lastPeriod ? lastPeriod.endAge : getCurrentAgeYears();
    setExpensePeriods([...expensePeriods, {
      startAge: newStartAge,
      endAge: retirementAge,
      amount: 60000
    }]);
  };

  const updateSavingsPeriod = (index, field, value) => {
    const updated = [...savingsPeriods];
    updated[index] = { ...updated[index], [field]: value };
    setSavingsPeriods(updated);
  };

  const updateSavingsPeriodGrowthType = (index, newGrowthType) => {
    const updated = [...savingsPeriods];
    const defaultRate = useIncomeGrowth ? incomeGrowthRate : 0.03;
    updated[index] = { 
      ...updated[index], 
      growthType: newGrowthType,
      growthRate: newGrowthType === 'growth' ? defaultRate : updated[index].growthRate
    };
    setSavingsPeriods(updated);
  };

  const updateExpensePeriod = (index, field, value) => {
    const updated = [...expensePeriods];
    updated[index] = { ...updated[index], [field]: value };
    setExpensePeriods(updated);
  };

  const updateExpensePeriodType = (index, newType) => {
    const updated = [...expensePeriods];
    if (newType === 'replacement') {
      updated[index] = { 
        ...updated[index], 
        replacementRate: 0.8,
        amount: undefined
      };
    } else {
      updated[index] = { 
        ...updated[index], 
        amount: 60000,
        replacementRate: undefined
      };
    }
    setExpensePeriods(updated);
  };

  const addAssetClass = () => {
    setAssetClasses([...assetClasses, { name: 'New Asset', allocation: 0.1, return: 0.06 }]);
  };

  const updateAssetClass = (index, field, value) => {
    const updated = [...assetClasses];
    updated[index] = { ...updated[index], [field]: value };
    setAssetClasses(updated);
  };

  const addAdditionalIncome = () => {
    setAdditionalIncome([...additionalIncome, {
      name: 'Additional Income',
      amount: 10000,
      startAge: getCurrentAgeYears(),
      endAge: retirementAge,
      type: 'annual'
    }]);
  };

  const updateAdditionalIncome = (index, field, value) => {
    const updated = [...additionalIncome];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalIncome(updated);
  };

  const removeAdditionalIncome = (index) => {
    const updated = additionalIncome.filter((_, i) => i !== index);
    setAdditionalIncome(updated);
  };

  const removeSavingsPeriod = (index) => {
    const updated = savingsPeriods.filter((_, i) => i !== index);
    setSavingsPeriods(updated);
  };

  const removeExpensePeriod = (index) => {
    const updated = expensePeriods.filter((_, i) => i !== index);
    setExpensePeriods(updated);
  };

  // Helper to get the effective portfolio values
  const getPortfolioValues = () => {
    if (customTotalPortfolio !== '' && isEditingTotal && !isNaN(Number(customTotalPortfolio))) {
      return {
        taxable: Number(customTotalPortfolio),
        _401k: 0,
        roth: 0,
      };
    }
    return {
      taxable: currentTaxable,
      _401k: current401k,
      roth: currentRoth,
    };
  };

  // Sync total field with individual fields unless editing total
  useEffect(() => {
    if (!isEditingTotal) {
      setCustomTotalPortfolio(String(currentTaxable + current401k + currentRoth));
    }
    // eslint-disable-next-line
  }, [currentTaxable, current401k, currentRoth]);

  // Helper to get all current input state as a profile object
  const getCurrentProfile = (name) => ({
    name,
    birthDate,
    currentYear,
    annualIncome,
    incomeGrowthRate,
    useIncomeGrowth,
    federalTaxRate,
    stateTaxRate,
    inflationRate,
    retirementAge,
    lifeExpectancy,
    currentTaxable,
    current401k,
    currentRoth,
    socialSecurityAmount,
    socialSecurityAge,
    swr,
    useAssetClasses,
    generalReturn,
    assetClasses,
    savingsPeriods,
    expensePeriods,
    additionalIncome,
    customTotalPortfolio,
    isEditingTotal,
    customWithdrawalAnnual,
    retirementReturn,
  });

  // Helper to load a profile into state
  const loadProfile = (profile) => {
    setBirthDate(profile.birthDate);
    setCurrentYear(profile.currentYear);
    setAnnualIncome(profile.annualIncome);
    setIncomeGrowthRate(profile.incomeGrowthRate);
    setUseIncomeGrowth(profile.useIncomeGrowth);
    setFederalTaxRate(profile.federalTaxRate);
    setStateTaxRate(profile.stateTaxRate);
    setInflationRate(profile.inflationRate);
    setRetirementAge(profile.retirementAge);
    setLifeExpectancy(profile.lifeExpectancy);
    setCurrentTaxable(profile.currentTaxable);
    setCurrent401k(profile.current401k);
    setCurrentRoth(profile.currentRoth);
    setSocialSecurityAmount(profile.socialSecurityAmount);
    setSocialSecurityAge(profile.socialSecurityAge);
    setSwr(profile.swr);
    setUseAssetClasses(profile.useAssetClasses);
    setGeneralReturn(profile.generalReturn);
    setAssetClasses(profile.assetClasses);
    setSavingsPeriods(profile.savingsPeriods);
    setExpensePeriods(profile.expensePeriods);
    setAdditionalIncome(profile.additionalIncome);
    setCustomTotalPortfolio(profile.customTotalPortfolio);
    setIsEditingTotal(profile.isEditingTotal);
    setCustomWithdrawalAnnual(profile.customWithdrawalAnnual);
    setRetirementReturn(profile.retirementReturn);
  };

  // Create Profile handler
  const handleCreateProfile = () => {
    const name = prompt('Enter a name for this profile:');
    if (!name) return;
    const newProfile = getCurrentProfile(name);
    setProfiles([...profiles, newProfile]);
    setSelectedProfile(name);
  };

  // Profile selection handler
  const handleSelectProfile = (name) => {
    setSelectedProfile(name);
    const profile = profiles.find(p => p.name === name);
    if (profile) loadProfile(profile);
  };

  // Place the profile dropdown and create button above the header
  return (
    <div className="container mx-auto p-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <label className="font-semibold">Scenario:</label>
        <select
          className="form-input w-48"
          value={selectedProfile || ''}
          onChange={e => handleSelectProfile(e.target.value)}
        >
          <option value="">-- Select Profile --</option>
          {profiles.map(profile => (
            <option key={profile.name} value={profile.name}>{profile.name}</option>
          ))}
        </select>
        <button className="btn btn-primary btn-sm" onClick={handleCreateProfile}>
          Create Profile
        </button>
        {selectedProfile && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              // Update the selected profile with current state
              setProfiles(prev => prev.map(p =>
                p.name === selectedProfile ? getCurrentProfile(selectedProfile) : p
              ));
            }}
          >
            Save Profile
          </button>
        )}
      </div>
      {/* Header */}
      <div className="card mb-8">
        <div className="card-header">
          <div className="flex items-center">
            <div className="bg-primary-100 p-3 rounded-xl mr-4">
              <Calculator className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Advanced Retirement Planner</h1>
              <p className="text-gray-600 mt-1">Plan your path to financial independence with precision</p>
            </div>
          </div>
        </div>
      </div>

      {/* Input Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Basic Information */}
        <div className="card">
          <div 
            className="card-header cursor-pointer"
            onClick={() => toggleSection('basic')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-primary-100 p-2 rounded-lg mr-3">
                  <Settings className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Basic Information</h3>
              </div>
              {expandedSections.basic ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
          {expandedSections.basic && (
            <div className="card-body space-y-4">
              <div className="form-group">
                <label className="form-label">Birth Date</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Annual Income</label>
                <input
                  type="number"
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(Number(e.target.value))}
                  className="form-input"
                  min="0"
                  step="1000"
                />
              </div>
              <div className="form-group">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useIncomeGrowth}
                    onChange={(e) => setUseIncomeGrowth(e.target.checked)}
                    className="form-checkbox mr-3"
                  />
                  <span className="text-sm font-medium">Income grows annually</span>
                </label>
                {useIncomeGrowth && (
                  <div className="mt-3">
                    <label className="form-label">Annual Growth Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      value={incomeGrowthRate}
                      onChange={(e) => setIncomeGrowthRate(Number(e.target.value))}
                      className="form-input"
                      placeholder="0.03 = 3%"
                    />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Retirement Age</label>
                <input
                  type="number"
                  value={retirementAge}
                  onChange={(e) => setRetirementAge(Number(e.target.value))}
                  className="form-input"
                  min="40"
                  max="80"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Life Expectancy</label>
                <input
                  type="number"
                  value={lifeExpectancy}
                  onChange={(e) => setLifeExpectancy(Number(e.target.value))}
                  className="form-input"
                  min="60"
                  max="120"
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Tax & Economic Settings */}
        <div className="card">
          <div 
            className="card-header cursor-pointer"
            onClick={() => toggleSection('tax')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-success-100 p-2 rounded-lg mr-3">
                  <DollarSign className="w-5 h-5 text-success-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Tax & Economic</h3>
              </div>
              {expandedSections.tax ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
          {expandedSections.tax && (
            <div className="card-body space-y-4">
              <div className="form-group">
                <label className="form-label">Federal Tax Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={federalTaxRate}
                  onChange={(e) => setFederalTaxRate(Number(e.target.value))}
                  className="form-input"
                  min="0"
                  max="1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">State Tax Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={stateTaxRate}
                  onChange={(e) => setStateTaxRate(Number(e.target.value))}
                  className="form-input"
                  min="0"
                  max="1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Inflation Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={inflationRate}
                  onChange={(e) => setInflationRate(Number(e.target.value))}
                  className="form-input"
                  min="0"
                  max="1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Safe Withdrawal Rate (SWR)</label>
                <input
                  type="number"
                  step="0.001"
                  value={swr}
                  onChange={(e) => setSwr(Number(e.target.value))}
                  className="form-input"
                  min="0.01"
                  max="0.10"
                  placeholder="0.040 = 4%"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Annual withdrawal rate from portfolio during retirement (4% is traditional rule)
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Current Balances */}
        <div className="card">
          <div 
            className="card-header cursor-pointer"
            onClick={() => toggleSection('balances')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-warning-100 p-2 rounded-lg mr-3">
                  <PiggyBank className="w-5 h-5 text-warning-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Current Balances</h3>
              </div>
              {expandedSections.balances ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
          {expandedSections.balances && (
            <div className="card-body space-y-4">
              <div className="form-group">
                <label className="form-label font-semibold">Total Portfolio</label>
                <input
                  type="number"
                  value={customTotalPortfolio}
                  onChange={e => {
                    setIsEditingTotal(true);
                    setCustomTotalPortfolio(e.target.value);
                    setCurrentTaxable(Number(e.target.value));
                    setCurrent401k(0);
                    setCurrentRoth(0);
                  }}
                  onBlur={() => setIsEditingTotal(false)}
                  className="form-input"
                  min="0"
                  placeholder="Enter total portfolio value"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Taxable Investments</label>
                <input
                  type="number"
                  value={currentTaxable}
                  onChange={e => {
                    setCurrentTaxable(Number(e.target.value));
                    setIsEditingTotal(false);
                  }}
                  className="form-input"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">401(k) Traditional</label>
                <input
                  type="number"
                  value={current401k}
                  onChange={e => {
                    setCurrent401k(Number(e.target.value));
                    setIsEditingTotal(false);
                  }}
                  className="form-input"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Roth Balance</label>
                <input
                  type="number"
                  value={currentRoth}
                  onChange={e => {
                    setCurrentRoth(Number(e.target.value));
                    setIsEditingTotal(false);
                  }}
                  className="form-input"
                  min="0"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Investment Returns */}
      <div className="card mb-8">
        <div 
          className="card-header cursor-pointer"
          onClick={() => toggleSection('investments')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-primary-100 p-2 rounded-lg mr-3">
                <TrendingUp className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Investment Returns</h3>
            </div>
            {expandedSections.investments ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
        {expandedSections.investments && (
          <div className="card-body">
            <div className="mb-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAssetClasses}
                  onChange={(e) => setUseAssetClasses(e.target.checked)}
                  className="mr-2"
                />
                <span className="font-medium">Use different asset classes with specific returns</span>
              </label>
            </div>
            
            {!useAssetClasses ? (
              <>
                <div className="form-group">
                  <label className="form-label">General Return Rate</label>
                  <input
                    type="number"
                    step="0.001"
                    value={generalReturn}
                    onChange={(e) => setGeneralReturn(Number(e.target.value))}
                    className="form-input w-32"
                    min="0"
                    max="1"
                    placeholder="0.070 = 7%"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Retirement Return Rate</label>
                  <input
                    type="number"
                    step="0.001"
                    value={retirementReturn}
                    onChange={(e) => setRetirementReturn(Number(e.target.value))}
                    className="form-input w-32"
                    min="0"
                    max="1"
                    placeholder="0.040 = 4%"
                  />
                </div>
              </>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {assetClasses.map((asset, index) => (
                    <div key={index} className="card">
                      <div className="card-body">
                        <input
                          type="text"
                          value={asset.name}
                          onChange={(e) => updateAssetClass(index, 'name', e.target.value)}
                          className="form-input mb-3"
                          placeholder="Asset name"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="form-label">Allocation</label>
                            <input
                              type="number"
                              step="0.01"
                              value={asset.allocation}
                              onChange={(e) => updateAssetClass(index, 'allocation', Number(e.target.value))}
                              className="form-input"
                              min="0"
                              max="1"
                            />
                          </div>
                          <div>
                            <label className="form-label">Return Rate</label>
                            <input
                              type="number"
                              step="0.001"
                              value={asset.return}
                              onChange={(e) => updateAssetClass(index, 'return', Number(e.target.value))}
                              className="form-input"
                              min="0"
                              max="1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addAssetClass}
                  className="btn btn-secondary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Asset Class
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Savings & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Savings Periods */}
        <div className="card">
          <div 
            className="card-header cursor-pointer"
            onClick={() => toggleSection('savings')}
          >
            <div className="flex items-center">
              <div className="bg-success-100 p-2 rounded-lg mr-3">
                <PiggyBank className="w-5 h-5 text-success-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Savings</h3>
            </div>
          </div>
          {expandedSections.savings && (
            <div className="card-body">
              {savingsPeriods.map((period, index) => (
                <div key={index} className="card mb-4">
                  <div className="card-body">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="form-label">Start Age</label>
                        <input
                          type="number"
                          value={period.startAge}
                          onChange={(e) => updateSavingsPeriod(index, 'startAge', Number(e.target.value))}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="form-label">End Age</label>
                        <input
                          type="number"
                          value={period.endAge}
                          onChange={(e) => updateSavingsPeriod(index, 'endAge', Number(e.target.value))}
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="form-group flex items-center gap-2">
                      <label className="form-label">Annual Amount</label>
                      <input
                        type="number"
                        value={period.amount}
                        onChange={e => {
                          const value = Number(e.target.value);
                          updateSavingsPeriod(index, 'amount', value);
                          if (period.amountType === 'percent') {
                            // If percent, update percent value only
                            // (annual = percent * takeHomePay)
                          } else {
                            // If dollar, update monthly
                            // (monthly = annual / 12)
                          }
                        }}
                        className="form-input w-32"
                        min="0"
                        step="any"
                      />
                      <select
                        value={period.amountType || 'dollar'}
                        onChange={e => updateSavingsPeriod(index, 'amountType', e.target.value)}
                        className="form-input w-32"
                      >
                        <option value="dollar">$</option>
                        <option value="percent">% of After Tax Income</option>
                      </select>
                    </div>
                    <div className="form-group flex items-center gap-2">
                      <label className="form-label">Monthly Savings</label>
                      <input
                        type="number"
                        className="form-input w-32"
                        value={(() => {
                          if (period.amountType === 'percent') {
                            const takeHome = projectionData[0]?.takeHomePay || 0;
                            return ((period.amount * takeHome) / 12).toFixed(2);
                          } else {
                            return (period.amount / 12).toFixed(2);
                          }
                        })()}
                        onChange={e => {
                          const monthly = Number(e.target.value);
                          if (period.amountType === 'percent') {
                            const takeHome = projectionData[0]?.takeHomePay || 0;
                            const percent = takeHome > 0 ? (monthly * 12) / takeHome : 0;
                            updateSavingsPeriod(index, 'amount', percent);
                          } else {
                            updateSavingsPeriod(index, 'amount', monthly * 12);
                          }
                        }}
                        min="0"
                        step="any"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Growth Type</label>
                      <select
                        value={period.growthType}
                        onChange={(e) => updateSavingsPeriodGrowthType(index, e.target.value)}
                        className="form-input form-select"
                      >
                        <option value="fixed">Fixed Amount</option>
                        <option value="growth">Grows Annually</option>
                      </select>
                    </div>
                    {period.growthType === 'growth' && (
                      <div className="form-group">
                        <label className="form-label">Annual Growth Rate</label>
                        <div className="flex gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => updateSavingsPeriod(index, 'growthRate', inflationRate)}
                            className="btn btn-secondary btn-sm"
                          >
                            Match inflation rate: {(inflationRate * 100).toFixed(1)}%
                          </button>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={period.growthRate}
                          onChange={(e) => updateSavingsPeriod(index, 'growthRate', Number(e.target.value))}
                          className="form-input w-32"
                          placeholder="0.03 = 3%"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {period.growthRate === inflationRate ? 
                            `Savings will increase by ${(period.growthRate * 100).toFixed(1)}% each year (matches inflation rate)` :
                            `Savings will increase by ${(period.growthRate * 100).toFixed(1)}% each year`
                          }
                          {useIncomeGrowth && Math.abs(period.growthRate - incomeGrowthRate) < 0.001 && 
                            " (matches income growth rate)"
                          }
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end mt-4">
                      <button
                        onClick={() => removeSavingsPeriod(index)}
                        className="btn btn-danger btn-sm"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                onClick={addSavingsPeriod}
                className="btn btn-success"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Savings Period
              </button>
            </div>
          )}
        </div>

        {/* Expense Periods */}
        <div className="card">
          <div 
            className="card-header cursor-pointer"
            onClick={() => toggleSection('expenses')}
          >
            <div className="flex items-center">
              <div className="bg-warning-100 p-2 rounded-lg mr-3">
                <DollarSign className="w-5 h-5 text-warning-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Expenses</h3>
            </div>
          </div>
          {expandedSections.expenses && (
            <div className="card-body">
              {expensePeriods.map((period, index) => (
                <div key={index} className="card mb-4">
                  <div className="card-body">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="form-label">Start Age</label>
                        <input
                          type="number"
                          value={period.startAge}
                          onChange={(e) => updateExpensePeriod(index, 'startAge', Number(e.target.value))}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="form-label">End Age</label>
                        <input
                          type="number"
                          value={period.endAge}
                          onChange={(e) => updateExpensePeriod(index, 'endAge', Number(e.target.value))}
                          className="form-input"
                        />
                      </div>
                    </div>
                    {period.replacementRate ? (
                      <div className="form-group">
                        <label className="form-label">Replacement Rate (% of income)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={period.replacementRate}
                          onChange={(e) => updateExpensePeriod(index, 'replacementRate', Number(e.target.value))}
                          className="form-input"
                          min="0"
                          max="2"
                        />
                      </div>
                    ) : (
                      <div className="form-group">
                        <label className="form-label">Annual Amount <span className='text-xs text-gray-500'>(in today's dollars)</span></label>
                        <input
                          type="number"
                          value={period.amount}
                          onChange={(e) => updateExpensePeriod(index, 'amount', Number(e.target.value))}
                          className="form-input"
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label">Type</label>
                      <select
                        value={period.replacementRate ? 'replacement' : 'fixed'}
                        onChange={(e) => updateExpensePeriodType(index, e.target.value)}
                        className="form-input form-select"
                      >
                        <option value="fixed">Fixed Amount</option>
                        <option value="replacement">Income Replacement</option>
                      </select>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {period.replacementRate ? 
                        `${(period.replacementRate * 100).toFixed(0)}% of income from age ${period.startAge} to ${period.endAge}` :
                        `$${period.amount?.toLocaleString()} annually from age ${period.startAge} to ${period.endAge} (Increases by inflation)`
                      }
                    </div>
                    <div className="flex justify-end mt-4">
                      <button
                        onClick={() => removeExpensePeriod(index)}
                        className="btn btn-danger btn-sm"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                onClick={addExpensePeriod}
                className="btn btn-warning"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Expense Period
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Income Sources */}
      <div className="card mb-8">
        <div 
          className="card-header cursor-pointer flex items-center justify-between"
          onClick={() => toggleSection('additionalIncome')}
        >
          <div className="flex items-center">
            <div className="bg-primary-100 p-2 rounded-lg mr-3">
              <DollarSign className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Income Sources</h3>
          </div>
          <button
            onClick={e => { e.stopPropagation(); addAdditionalIncome(); }}
            className="btn btn-primary btn-sm flex items-center gap-1"
            title="Add Income Source"
          >
            <Plus className="w-4 h-4" />
            Add Income Source
          </button>
        </div>
        {expandedSections.additionalIncome && (
          <div className="card-body">
            {/* Recurring Income Sources List */}
            <div className="space-y-2 mb-6">
              {/* Social Security Row (editable) */}
              <div className="flex items-center justify-between bg-gray-50 rounded p-3">
                <div className="font-medium flex flex-col gap-1">
                  <span>Social Security</span>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-500">Start Age:</span>
                    <input
                      type="number"
                      value={socialSecurityAge}
                      onChange={e => setSocialSecurityAge(Number(e.target.value))}
                      className="form-input w-20 text-xs py-1 px-2"
                      min="62"
                      max="70"
                    />
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex flex-col items-end">
                    <label className="text-xs text-gray-500">Monthly</label>
                    <input
                      type="number"
                      value={socialSecurityAmount}
                      onChange={e => setSocialSecurityAmount(Number(e.target.value))}
                      className="form-input w-24 text-right"
                      min="0"
                    />
                  </div>
                  <div className="flex flex-col items-end">
                    <label className="text-xs text-gray-500">Annual</label>
                    <input
                      type="number"
                      value={socialSecurityAmount * 12}
                      onChange={e => setSocialSecurityAmount(Number(e.target.value) / 12)}
                      className="form-input w-24 text-right"
                      min="0"
                    />
                  </div>
                </div>
              </div>
              {/* Recurring Income Sources (editable) */}
              {additionalIncome
                .map((income, index) => ({ ...income, originalIndex: index }))
                .filter(inc => inc.type === 'annual')
                .map((income) => (
                  <div key={income.originalIndex} className="flex items-center justify-between bg-gray-50 rounded p-3">
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        value={income.name}
                        onChange={e => updateAdditionalIncome(income.originalIndex, 'name', e.target.value)}
                        className="form-input w-40 mb-1"
                        placeholder="Income Source"
                      />
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-gray-500">Start Age:</span>
                        <input
                          type="number"
                          value={income.startAge}
                          onChange={e => updateAdditionalIncome(income.originalIndex, 'startAge', Number(e.target.value))}
                          className="form-input w-16 text-xs py-1 px-2"
                        />
                        <span className="text-xs text-gray-500">End Age:</span>
                        <input
                          type="number"
                          value={income.endAge}
                          onChange={e => updateAdditionalIncome(income.originalIndex, 'endAge', Number(e.target.value))}
                          className="form-input w-16 text-xs py-1 px-2"
                        />
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <div className="flex flex-col items-end">
                        <label className="text-xs text-gray-500">Annual</label>
                        <input
                          type="number"
                          value={income.amount}
                          onChange={e => {
                            const value = Number(e.target.value);
                            updateAdditionalIncome(income.originalIndex, 'amount', value);
                          }}
                          className="form-input w-24 text-right"
                          min="0"
                          step="any"
                        />
                      </div>
                      <div className="flex flex-col items-end">
                        <label className="text-xs text-gray-500">Monthly</label>
                        <input
                          type="number"
                          value={(income.amount / 12).toFixed(2)}
                          onChange={e => {
                            const value = Number(e.target.value);
                            updateAdditionalIncome(income.originalIndex, 'amount', value * 12);
                          }}
                          className="form-input w-24 text-right"
                          min="0"
                          step="any"
                        />
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col items-end gap-2">
                      <select
                        value={income.type}
                        onChange={e => updateAdditionalIncome(income.originalIndex, 'type', e.target.value)}
                        className="form-input form-select w-32 text-xs"
                      >
                        <option value="annual">Annual Recurring</option>
                        <option value="one-time">One-Time Event</option>
                      </select>
                      <button
                        onClick={() => removeAdditionalIncome(income.originalIndex)}
                        className="btn btn-danger btn-xs"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              {/* Total Income Row */}
              <div className="flex items-center justify-between bg-success-50 rounded p-3 mt-2">
                <div className="font-semibold">Total Income</div>
                <div className="flex gap-6">
                  <div>
                    <div className="text-xs text-gray-500">Monthly</div>
                    <div className="font-mono">${(
                      socialSecurityAmount +
                      additionalIncome.filter(inc => inc.type === 'annual').reduce((sum, inc) => sum + (inc.amount / 12), 0) +
                      (customWithdrawalAnnual !== null ? customWithdrawalAnnual / 12 : 0)
                    ).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Annual</div>
                    <div className="font-mono">${(
                      (socialSecurityAmount * 12) +
                      additionalIncome.filter(inc => inc.type === 'annual').reduce((sum, inc) => sum + inc.amount, 0) +
                      (customWithdrawalAnnual !== null ? customWithdrawalAnnual : 0)
                    ).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Portfolio Withdrawals (editable) */}
            <div className="flex items-center justify-between bg-rose-50 rounded p-3 border border-rose-200 mt-6">
              <div className="font-semibold text-rose-700">Portfolio Withdrawals</div>
              <div className="flex gap-6 items-center">
                <div className="flex flex-col items-end">
                  <label className="text-xs text-gray-500">Monthly</label>
                  <input
                    type="number"
                    value={customWithdrawalAnnual !== null ? (customWithdrawalAnnual / 12).toFixed(2) : (() => {
                      // Calculate needed monthly
                      const currentAge = getCurrentAgeYears();
                      const applicableExpensePeriod = expensePeriods.find(period =>
                        currentAge >= period.startAge && currentAge <= period.endAge
                      );
                      let monthlyExpenses = 0;
                      if (applicableExpensePeriod) {
                        if (applicableExpensePeriod.replacementRate) {
                          const baseIncome = annualIncome;
                          monthlyExpenses = (baseIncome * applicableExpensePeriod.replacementRate) / 12;
                        } else {
                          monthlyExpenses = applicableExpensePeriod.amount / 12;
                        }
                      }
                      const totalMonthlyIncome = socialSecurityAmount + additionalIncome.filter(inc => inc.type === 'annual').reduce((sum, inc) => sum + (inc.amount / 12), 0);
                      const needed = monthlyExpenses - totalMonthlyIncome;
                      return needed > 0 ? needed.toFixed(2) : '0.00';
                    })()}
                    onChange={e => {
                      const value = Number(e.target.value);
                      setCustomWithdrawalAnnual(value * 12);
                    }}
                    className="form-input w-24 text-right"
                    min="0"
                    step="any"
                  />
                </div>
                <div className="flex flex-col items-end">
                  <label className="text-xs text-gray-500">Annual</label>
                  <input
                    type="number"
                    value={customWithdrawalAnnual !== null ? customWithdrawalAnnual.toFixed(2) : (() => {
                      // Calculate needed annual
                      const currentAge = getCurrentAgeYears();
                      const applicableExpensePeriod = expensePeriods.find(period =>
                        currentAge >= period.startAge && currentAge <= period.endAge
                      );
                      let annualExpenses = 0;
                      if (applicableExpensePeriod) {
                        if (applicableExpensePeriod.replacementRate) {
                          const baseIncome = annualIncome;
                          annualExpenses = baseIncome * applicableExpensePeriod.replacementRate;
                        } else {
                          annualExpenses = applicableExpensePeriod.amount;
                        }
                      }
                      const totalAnnualIncome = (socialSecurityAmount * 12) + additionalIncome.filter(inc => inc.type === 'annual').reduce((sum, inc) => sum + inc.amount, 0);
                      const needed = annualExpenses - totalAnnualIncome;
                      return needed > 0 ? needed.toFixed(2) : '0.00';
                    })()}
                    onChange={e => {
                      const value = Number(e.target.value);
                      setCustomWithdrawalAnnual(value);
                    }}
                    className="form-input w-24 text-right"
                    min="0"
                    step="any"
                  />
                </div>
                <button
                  className="btn btn-secondary btn-xs ml-4"
                  type="button"
                  onClick={() => {
                    // Set to needed value
                    const currentAge = getCurrentAgeYears();
                    const isRetired = currentAge >= retirementAge;
                    const applicableExpensePeriod = expensePeriods.find(period =>
                      currentAge >= period.startAge && currentAge <= period.endAge
                    );
                    let annualExpenses = 0;
                    if (applicableExpensePeriod) {
                      if (applicableExpensePeriod.replacementRate) {
                        // If already retired, base income is not job income
                        const baseIncome = isRetired ? 0 : annualIncome;
                        annualExpenses = baseIncome * applicableExpensePeriod.replacementRate;
                      } else {
                        annualExpenses = applicableExpensePeriod.amount;
                      }
                    }
                    const totalAnnualIncome = (socialSecurityAmount * 12) + additionalIncome.filter(inc => inc.type === 'annual').reduce((sum, inc) => sum + inc.amount, 0);
                    const needed = annualExpenses - totalAnnualIncome;
                    console.log('Cover Expenses Debug:', { annualExpenses, totalAnnualIncome, needed, isRetired });
                    setCustomWithdrawalAnnual(needed > 0 ? needed : null);
                  }}
                >
                  Cover Expenses
                </button>
                {customWithdrawalAnnual !== null && (
                  <span className="ml-2 text-xs text-rose-700">Custom</span>
                )}
                {customWithdrawalAnnual === null && (
                  <span className="ml-2 text-xs text-gray-500">Auto</span>
                )}
              </div>
            </div>
            {/* One-Time Portfolio Additions */}
            {additionalIncome.filter(inc => inc.type === 'one-time').length > 0 && (
              <div className="mt-8">
                <div className="font-semibold mb-2 text-gray-700">One-Time Portfolio Additions</div>
                <div className="space-y-2">
                  {additionalIncome
                    .map((income, index) => ({ ...income, originalIndex: index }))
                    .filter(inc => inc.type === 'one-time')
                    .map((income) => (
                      <div key={income.originalIndex} className="flex items-center justify-between bg-blue-50 rounded p-3">
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            value={income.name}
                            onChange={e => updateAdditionalIncome(income.originalIndex, 'name', e.target.value)}
                            className="form-input w-40 mb-1"
                            placeholder="One-Time Event"
                          />
                          <div className="flex gap-2 items-center">
                            <span className="text-xs text-gray-500">Event Age:</span>
                            <input
                              type="number"
                              value={income.startAge}
                              onChange={e => updateAdditionalIncome(income.originalIndex, 'startAge', Number(e.target.value))}
                              className="form-input w-16 text-xs py-1 px-2"
                            />
                            <label className="flex items-center ml-4 text-xs text-gray-500">
                              <input
                                type="checkbox"
                                checked={!!income.inflate}
                                onChange={e => updateAdditionalIncome(income.originalIndex, 'inflate', e.target.checked)}
                                className="form-checkbox mr-1"
                              />
                              Adjust for inflation
                            </label>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <label className="text-xs text-gray-500">Amount</label>
                          <input
                            type="number"
                            value={income.amount}
                            onChange={e => updateAdditionalIncome(income.originalIndex, 'amount', Number(e.target.value))}
                            className="form-input w-24 text-right"
                            min="0"
                            step="any"
                          />
                          {income.inflate && (
                            <div className="text-xs text-gray-500 mt-1">(in today's dollars)</div>
                          )}
                        </div>
                        <div className="ml-4 flex flex-col items-end gap-2">
                          <select
                            value={income.type}
                            onChange={e => updateAdditionalIncome(income.originalIndex, 'type', e.target.value)}
                            className="form-input form-select w-32 text-xs"
                          >
                            <option value="annual">Annual Recurring</option>
                            <option value="one-time">One-Time Event</option>
                          </select>
                          <button
                            onClick={() => removeAdditionalIncome(income.originalIndex)}
                            className="btn btn-danger btn-xs"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Charts */}
      <div className="mb-8">
        {/* Portfolio Growth Over Time (full width) */}
        <div className="card mb-8">
          <div className="card-header">
            <h3 className="text-xl font-semibold text-gray-800">Portfolio Growth Over Time</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={projectionData} margin={{ top: 40, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="ageYears" stroke="#6b7280" tickFormatter={v => `${v}`} />
                <YAxis tickFormatter={formatYAxis} stroke="#6b7280" />
                <Legend verticalAlign="top" height={36} />
                <defs>
                  <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="totalInvestments" stroke="none" fill="url(#portfolioFill)" />
                <Line type="monotone" dataKey="totalInvestments" stroke="#3b82f6" strokeWidth={3} name="Total Investments" dot={false} />
                <Line type="monotone" dataKey="fireNumber" stroke="#22c55e" strokeWidth={2} name="FIRE Number" strokeDasharray="6 3" dot={false} />
                <Line type="monotone" dataKey="coastFIRE" stroke="#f59e0b" strokeWidth={2} name="Coast FIRE" strokeDasharray="4 4" dot={false} />
                <ReferenceLine x={retirementAge} stroke="#6366f1" strokeDasharray="2 2" label={{ value: 'Retirement', position: 'top', fill: '#6366f1', fontWeight: 600 }} />
                {(() => {
                  const fireRow = projectionData.find(d => d.totalInvestments >= d.fireNumber);
                  return fireRow ? (
                    <ReferenceLine x={fireRow.ageYears} stroke="#22c55e" strokeDasharray="2 2" label={{ value: 'FIRE', position: 'top', fill: '#22c55e', fontWeight: 600 }} />
                  ) : null;
                })()}
                {(() => {
                  const coastRow = projectionData.find(d => d.totalInvestments >= d.coastFIRE);
                  return coastRow ? (
                    <ReferenceLine x={coastRow.ageYears} stroke="#f59e0b" strokeDasharray="2 2" label={{ value: 'Coast FIRE', position: 'top', fill: '#f59e0b', fontWeight: 600 }} />
                  ) : null;
                })()}
                {/* Staggered ReferenceLines for one-time events */}
                {additionalIncome.filter(inc => inc.type === 'one-time').map((event, idx) => (
                  <ReferenceLine
                    key={idx}
                    x={event.startAge}
                    stroke="#0ea5e9"
                    strokeDasharray="2 2"
                    label={{
                      value: event.name ? `${event.name} ($${event.amount.toLocaleString()})` : `One-Time ($${event.amount.toLocaleString()})`,
                      position: idx % 2 === 0 ? 'top' : 'bottom',
                      fill: '#0ea5e9',
                      fontWeight: 600,
                      fontSize: 12
                    }}
                  />
                ))}
                <Tooltip
                  formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name]}
                  labelFormatter={label => `Age: ${label}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Income vs Expenses (full width, below) */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-xl font-semibold text-gray-800">Income vs Expenses</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectionData.filter(d => d.ageYears <= retirementAge + 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="ageYears" stroke="#6b7280" />
                <YAxis tickFormatter={formatYAxis} stroke="#6b7280" />
                <Tooltip 
                  formatter={(value) => `$${value.toLocaleString()}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Legend />
                <Bar dataKey="takeHomePay" fill="#3b82f6" name="Take Home Pay" />
                <Bar dataKey="annualExpenses" fill="#22c55e" name="Annual Expenses" />
                <Bar dataKey="annualSavings" fill="#f59e0b" name="Annual Savings" />
                <Bar dataKey="additionalIncome" fill="#6366f1" name="Recurring Additional Income" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="text-center p-6 bg-primary-50 rounded-xl border border-primary-200">
          <div className="text-3xl font-bold text-primary-600 mb-2">
            {(() => {
              const row = projectionData.find(d => {
                const yearMatch = typeof d.age === 'string' ? parseInt(d.age) : d.age;
                return yearMatch === retirementAge;
              });
              return row ? `$${row.totalInvestments.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '0';
            })()}
          </div>
          <div className="text-sm text-gray-600 font-medium">Portfolio at Retirement</div>
        </div>
        <div className="text-center p-6 bg-success-50 rounded-xl border border-success-200">
          <div className="text-3xl font-bold text-success-600 mb-2">
            {todaysExpenses && swr ? `$${(todaysExpenses / swr).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '0'}
          </div>
          <div className="text-sm text-gray-600 font-medium">FIRE Today</div>
        </div>
        <div className="text-center p-6 bg-warning-50 rounded-xl border border-warning-200">
          <div className="text-3xl font-bold text-warning-600 mb-2">
            {retirementAge - getCurrentAgeYears()} years
          </div>
          <div className="text-sm text-gray-600 font-medium">Years to Retirement</div>
        </div>
        <div className="text-center p-6 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-3xl font-bold text-gray-600 mb-2">
            {(() => {
              const row = projectionData.find(d => {
                const yearMatch = typeof d.age === 'string' ? parseInt(d.age) : d.age;
                return yearMatch === retirementAge;
              });
              return row && fireAtRetirement && row.totalInvestments >= fireAtRetirement ? '✅' : '❌';
            })()}
          </div>
          <div className="text-sm text-gray-600 font-medium">FIRE Achievable</div>
        </div>
        <div className="text-center p-6 bg-indigo-50 rounded-xl border border-indigo-200">
          <div className="text-3xl font-bold text-indigo-600 mb-2">
            {projectionData && projectionData.length > 0 && !isNaN(fireAtRetirement) ? `$${fireAtRetirement.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '--'}
          </div>
          <div className="text-sm text-gray-600 font-medium">FIRE at Retirement</div>
          <div className="text-xs text-gray-400 mt-1">Inflation-adjusted portfolio needed</div>
        </div>
        <div className="text-center p-6 bg-teal-50 rounded-xl border border-teal-200">
          <div className="text-3xl font-bold text-teal-600 mb-2">
            {(() => {
              const coastFireToday = fireAtRetirement && yearsToRetirement > 0
                ? fireAtRetirement / Math.pow(1 + effectiveReturn, yearsToRetirement)
                : 0;
              return coastFireToday ? `$${coastFireToday.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '0';
            })()}
          </div>
          <div className="text-sm text-gray-600 font-medium">Coast FIRE Today</div>
          <div className="text-xs text-gray-400 mt-1">Present value needed to coast to retirement</div>
        </div>
        <div className="text-center p-6 bg-cyan-50 rounded-xl border border-cyan-200">
          <div className="text-3xl font-bold text-cyan-600 mb-2">
            {(() => {
              const currentAge = currentAgeYears;
              const row = projectionData
                .filter(d => d.ageYears < retirementAge)
                .find(d => d.totalInvestments >= d.coastFIRE);
              if (row) {
                const years = row.ageYears - currentAge;
                return years >= 0 ? `${years.toFixed(1)} yrs` : '0 yrs';
              }
              return '—';
            })()}
          </div>
          <div className="text-sm text-gray-600 font-medium">Time to Coast</div>
          <div className="text-xs text-gray-400 mt-1">Years to reach Coast FIRE</div>
        </div>
        <div className="text-center p-6 bg-rose-50 rounded-xl border border-rose-200">
          <div className="text-3xl font-bold text-rose-600 mb-2">
            {(() => {
              const currentAge = currentAgeYears;
              const row = projectionData
                .filter(d => d.ageYears < retirementAge)
                .find(d => d.totalInvestments >= d.fireNumber);
              if (row) {
                const years = row.ageYears - currentAge;
                return years >= 0 ? `${years.toFixed(1)} yrs` : '0 yrs';
              }
              return '—';
            })()}
          </div>
          <div className="text-sm text-gray-600 font-medium">Time to FIRE</div>
          <div className="text-xs text-gray-400 mt-1">Years to reach FIRE</div>
        </div>
        {/* Projected Age at FIRE */}
        <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
          <div className="text-2xl font-bold text-green-600 mb-2">
            {(() => {
              const row = projectionData.find(d => d.totalInvestments >= d.fireNumber);
              return row ? row.age : '--';
            })()}
          </div>
          <div className="text-sm text-gray-600 font-medium">Projected Age at FIRE</div>
        </div>
        {/* Projected Age at Coast FIRE */}
        <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-200">
          <div className="text-2xl font-bold text-blue-600 mb-2">
            {(() => {
              const row = projectionData
                .filter(d => d.ageYears < retirementAge)
                .find(d => d.totalInvestments >= d.coastFIRE);
              return row ? row.age : '--';
            })()}
          </div>
          <div className="text-sm text-gray-600 font-medium">Projected Age at Coast FIRE</div>
        </div>
        {/* Years of Safe Withdrawals at Retirement */}
        <div className="text-center p-6 bg-yellow-50 rounded-xl border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-600 mb-2">
            {(() => {
              const row = projectionData.find(d => d.ageYears === retirementAge);
              return row ? (row.totalInvestments / row.annualExpenses).toFixed(1) : '--';
            })()}
          </div>
          <div className="text-sm text-gray-600 font-medium">Years of Safe Withdrawals</div>
        </div>
        {/* Withdrawal Rate at Retirement */}
        <div className="text-center p-6 bg-pink-50 rounded-xl border border-pink-200">
          <div className="text-2xl font-bold text-pink-600 mb-2">
            {(() => {
              const row = projectionData.find(d => d.ageYears === retirementAge);
              return row ? ((row.annualExpenses / row.totalInvestments) * 100).toFixed(2) + '%' : '--';
            })()}
          </div>
          <div className="text-sm text-gray-600 font-medium">Withdrawal Rate at Retirement</div>
        </div>
        {/* Max Drawdown after Retirement */}
        <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200">
          <div className="text-2xl font-bold text-red-600 mb-2">
            {(() => {
              let maxDrawdown = 0;
              let peak = 0;
              let afterRetirement = projectionData.filter(d => d.ageYears >= retirementAge);
              afterRetirement.forEach(d => {
                if (d.totalInvestments > peak) peak = d.totalInvestments;
                const drawdown = peak - d.totalInvestments;
                if (drawdown > maxDrawdown) maxDrawdown = drawdown;
              });
              return maxDrawdown > 0 ? `$${maxDrawdown.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '--';
            })()}
          </div>
          <div className="text-sm text-gray-600 font-medium">Max Drawdown (Post-Retirement)</div>
        </div>
        {/* Taxable vs. Tax-Advantaged Split at Retirement */}
        <div className="text-center p-6 bg-indigo-50 rounded-xl border border-indigo-200">
          <div className="text-lg font-bold text-indigo-600 mb-2">
            {(() => {
              const row = projectionData.find(d => d.ageYears === retirementAge);
              if (!row) return '--';
              // If you track these separately, display them; otherwise, show total
              // For now, just show total investments
              return `$${row.totalInvestments.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
            })()}
          </div>
          <div className="text-xs text-gray-600 font-medium">Portfolio at Retirement</div>
          {/* If you have projTaxable, proj401k, projRoth, display them here as well */}
        </div>
      </div>
      
      {/* Data Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-xl font-semibold text-gray-800">Detailed Projections</h3>
        </div>
        <div className="card-body">
          <div className="flex items-center mb-4">
            <button
              className={`px-4 py-1 rounded-l-full border ${showTodayRow ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'} transition`}
              onClick={() => setShowTodayRow(true)}
              type="button"
            >
              Show from today
            </button>
            <button
              className={`px-4 py-1 rounded-r-full border-l-0 border ${!showTodayRow ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'} transition`}
              onClick={() => setShowTodayRow(false)}
              type="button"
            >
              Show from January
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="sticky top-0 bg-white z-10">Age</th>
                  <th className="sticky top-0 bg-white z-10">Income</th>
                  <th className="sticky top-0 bg-white z-10">Take Home</th>
                  <th className="sticky top-0 bg-white z-10">Expenses</th>
                  <th className="sticky top-0 bg-white z-10">Savings</th>
                  <th className="sticky top-0 bg-white z-10">Total Investments</th>
                  <th className="sticky top-0 bg-white z-10">Coast FIRE Number</th>
                  <th className="sticky top-0 bg-white z-10">FIRE Number</th>
                  <th className="sticky top-0 bg-white z-10">Additional Income</th>
                  <th className="sticky top-0 bg-white z-10">Retirement Income</th>
                </tr>
              </thead>
              <tbody>
                {projectionData.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="font-medium">{row.age}</td>
                    <td>${row.annualIncome.toLocaleString()}</td>
                    <td>${row.takeHomePay.toLocaleString()}</td>
                    <td>${row.annualExpenses.toLocaleString()}</td>
                    <td>${row.annualSavings.toLocaleString()}</td>
                    <td className="font-semibold">${row.totalInvestments.toLocaleString()}</td>
                    <td>${row.coastFIRE.toLocaleString()}</td>
                    <td>${row.fireNumber.toLocaleString()}</td>
                    <td>${row.additionalIncome.toLocaleString()}</td>
                    <td>${row.retirementIncome.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetirementPlanner;