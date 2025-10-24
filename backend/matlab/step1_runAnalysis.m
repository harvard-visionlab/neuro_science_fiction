function Results = step1_runAnalysis(teamName)
% step1_runAnalysis('bayesianmath')
% First steps of brain data analysis workshop.
% Students run the model on one brain-subject, just so they can see
% the process first hand. Results are not saved.

teamName = lower(teamName);
addpath('helper');

%% now run the analysis

% find feature set for this team
featureSet = subdir(fullfile('Data-FeatureRatings',['*' teamName '*']))
assert(length(featureSet)==1,'Oops, problem finding your data file.');
featureSet=featureSet.name;
parts = strsplit(featureSet,filesep());
teamYear = parts{2};

% analysis preferences (prefs for short)

% choose which features/subjects to include in analysis
prefs.featureSet=[]; % which features to use, empty=all, [1:3], [1 3 4 5], etc.
prefs.subList=[1]; % list subjects to analyze e.g., [1], [1 2], [1 2 3 4 5], [1:5])

% voxel selection
prefs.numVoxels=500; % number of voxels used, set to infinity (numVoxels=inf) to use all of them
prefs.voxelSelection='within'; % within or across subject reliability
prefs.voxelRelType='all'; % use all subjects, or leave out test subject

% more analysis preference s(probably don't need to change these)
prefs.ratings='actual'; % actual or random (sanity check)
prefs.metric='correlation'; % "correlation", "distance", "icc", "cosine"
prefs.analysisMethod='voxelglm'; % "voxelglm", "botastic"

prefs.output='basic'; % output can be basic, or advanced
prefs.testFeatures='yes'; % yes or no, whether to make predictions for each individual feature
prefs.accuracyMeasure='individual'; % combo or individual

% save file name
if (~exist(fullfile('Results-BrainPrediction',teamYear)))
    mkdir(fullfile('Results-BrainPrediction',teamYear));
end
saveFileNameBrain=fullfile('Results-BrainPrediction',teamYear,...
    [teamName '_' prefs.metric '_' prefs.accuracyMeasure '_' prefs.analysisMethod '_' num2str(prefs.numVoxels) '.mat']);

%% predict the brain data from features

% loop through each subject
Results=[];
numSubs=length(prefs.subList)

for subnum=1:numSubs
    
    % load data for this subject
    currSub=prefs.subList(subnum);    
    featureFileName=fullfile(featureSet);
    fmriFileName=fullfile('Data-fMRI',['data-science-P' num2str(currSub) '_converted.mat']);
    
    % predict brain data from these features for all unique, leave-2-out
    % possibilities (this will take a few minutes)
    r{subnum}=predictBrainData(currSub,featureFileName,fmriFileName,prefs);
    
end

% summarize results, save in "Results" data structure
for subnum=1:length(prefs.subList)
    Results.accuracyOverall(subnum)=r{subnum}.accuracyOverall;
    Results.accuracySameCat(subnum)=r{subnum}.accuracySameCat;
    Results.accuracyDiffCat(subnum)=r{subnum}.accuracyDiffCat;
    Results.aveAccByFeature(subnum,:)=r{subnum}.aveAccByFeature;
end

Results.ave_accuracyOverall=mean(Results.accuracyOverall);
Results.ave_accuracySameCat=mean(Results.accuracySameCat);
Results.ave_accuracyDiffCat=mean(Results.accuracyDiffCat);
Results.ave_aveAccByFeature=mean(Results.aveAccByFeature,1)

load(featureSet);
if ~isempty(prefs.featureSet)
    featureNames={featureNames{prefs.featureSet}};
end

%save(saveFileNameBrain,'r','Results','prefs','featureNames','itemNames');

%% print output

fprintf('\n\n%s, Accuracy for Sub%d = %3.2f\n\n',teamName,prefs.subList(1),Results.ave_accuracyOverall);

