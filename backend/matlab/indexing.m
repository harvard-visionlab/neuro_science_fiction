
%% 

D = load('dataCube.mat');
dataCube1 = D.aveDC(:,:,:,1);

R = load('./Results-BrainPrediction/2020/dopaminemachine_FinalSet_correlation_individual_voxelglm_500.mat')

r = R.r{1};
f = find(strcmp(R.featureNames, 'size'));
weights = r.betaAve(f+1,:)
idx=r.whichVoxels;
usedVoxels=r.usedVoxels;
subset = usedVoxels(idx);
dataCube2 = zeros(r.brainSize);    
dataCube2(subset) = weights;

all(dataCube1(:)==dataCube2(:))
