function step3_determineBestFeature(teamName)
% step3_determineBestFeature('bayesianmath')
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

close all;
figure('Position',[124 281 926 644]);

% load model fit results:
fileName=subdir(fullfile('Results-BrainPrediction',['*' teamName '*' scoring '*' method '*' num2str(numVoxels) '*']));
assert(length(fileName)==1,'Oops, problem finding your data file.');
fileName=fileName.name
load(fileName);

[sortval,sortidx]=sort(Results.ave_aveAccByFeature,'descend')
featureNames(sortidx)'

fontSize=16;
handles.bars=bar(sortval);
ylim([.4 1]);
xlim([0 length(featureNames)+1]);
title([teamName ': Performance for each feature by itself'],'FontName','Helvetica','FontSize',fontSize);
for i=1:length(featureNames) 
    featureNames{i}=strrep(featureNames{i},'_','-');
end
set(gca,'XTick',[1:length(featureNames)])
set(gca,'XTickLabel',featureNames(sortidx),'FontName','Helvetica','FontSize',fontSize)
ylabel('Percent Correct Classification','FontName','Helvetica','FontSize',fontSize);
set(get(handles.bars,'children'),'FaceColor',[.5 .5 .5]);
xticklabel_rotate([],90);

