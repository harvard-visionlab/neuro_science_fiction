function step4_visualizeMyFeatures(teamName, featureName)
% step4_visualizeMyFeatures('bayesianmath', 'weight')
% step4_visualizeMyFeatures('dopaminemachine', 'size')
addpath('helper');

% find feature set for this team
teamName = lower(teamName);
featureSet = subdir(fullfile('Results-BrainPrediction',['*' teamName '*']))
assert(length(featureSet)==1,'Oops, problem finding your data file.');
featureSet=featureSet.name
parts = strsplit(featureSet,filesep);
teamYear = parts{2};

% set some preferences
scoring = 'individual';
method = 'voxelglm';
numVoxels = 500;

%% do it
clc;
close all;
figure('Position',[185 214 1200 803]);

% load model fit results:
fileName=subdir(fullfile('Results-BrainPrediction',['*' teamName '*' scoring '*' method '*' num2str(numVoxels) '*']));
assert(length(fileName)==1,'Oops, problem finding your data file.');
fileName=fileName.name
load(fileName);


f=find(strcmp(lower(featureNames),lower(featureName)));

if isempty(f)
    close all;
    featureNames
    error(sprintf('Feature %s, not in the list!',featureName));
end

plotBrainCubeWeights(r,f,featureNames);




